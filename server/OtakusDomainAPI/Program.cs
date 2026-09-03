using System.Security.Claims;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.Models;
using OtakusDomainAPI.Services;

// 1. Force polling over Linux inotify to avoid container handle exhaustion
Environment.SetEnvironmentVariable("DOTNET_USE_POLLING_FILE_WATCHER", "true");
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// 2. Build WebApplication without reloadOnChange file watchers
var builderOptions = new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
};

var builder = WebApplication.CreateBuilder(builderOptions);

// Prevent FileSystemWatcher inotify crashes on appsettings.json
builder.Configuration.Sources.Clear();
builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: false)
    .AddEnvironmentVariables();

// Configure Render Port Binding (0.0.0.0:$PORT)
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// 3. Database Configuration with Connection Resiliency
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorCodesToAdd: null);
    }));

// 4. CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("OtakusDomainPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173", 
                "https://theotakusdomain.vercel.app"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 5. Global JSON Serialization Settings
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// 6. Supabase JWT Auth Setup
var jwksUri = builder.Configuration["Supabase:JwksUri"];
var jwtIssuer = builder.Configuration["Supabase:Issuer"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKeyResolver = (token, securityToken, kid, parameters) =>
            {
                if (string.IsNullOrWhiteSpace(jwksUri)) return Enumerable.Empty<SecurityKey>();
                try
                {
                    using var client = new HttpClient();
                    var json = client.GetStringAsync(jwksUri).Result;
                    var keys = new JsonWebKeySet(json);
                    return keys.GetSigningKeys();
                }
                catch
                {
                    return Enumerable.Empty<SecurityKey>();
                }
            },
            ValidateIssuer = !string.IsNullOrWhiteSpace(jwtIssuer),
            ValidIssuer = jwtIssuer,
            ValidateAudience = false,
            ValidateLifetime = true,
            NameClaimType = ClaimTypes.NameIdentifier,
            RoleClaimType = ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("AdultOnly", policy => policy.RequireClaim("is_18_plus", "true"));
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 7. Dependency Injection Services
builder.Services.AddHttpClient<IPaystackService, PaystackService>();
builder.Services.AddScoped<IEmailService, EmailService>();

var app = builder.Build();

// Enable Swagger in Production
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Otaku's Domain API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("OtakusDomainPolicy");

// Instant Health Endpoints for Render
app.MapGet("/", () => Results.Ok(new 
{ 
    status = "Online", 
    service = "Otaku's Domain Core Engine", 
    timestamp = DateTime.UtcNow 
}));

app.MapGet("/health", () => Results.Ok("healthy"));

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// 8. Non-blocking Database Seeding (Runs after the web server binds the port)
_ = Task.Run(async () =>
{
    await Task.Delay(2000);
    using var scope = app.Services.CreateScope();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (!await db.LandingSlides.AnyAsync())
        {
            db.LandingSlides.AddRange(
                new LandingSlide 
                { 
                    Panel = "01", 
                    Tag = "Next IRL Drop", 
                    Stamp = "EP. 01 — LIVE EVENT", 
                    Sfx = "GATHER!!", 
                    Title1 = "Anime", 
                    Title2 = "Fest", 
                    Kanji = "オタクコネクト", 
                    Desc = "500+ fans. Watch party, cosplay showdown, guild war points on the line.", 
                    BtnText = "Grab Your Tickets", 
                    TargetUrl = "/events",
                    ImageUrl = "/assets/fest.jpeg", 
                    DisplayOrder = 1 
                },
                new LandingSlide 
                { 
                    Panel = "02", 
                    Tag = "Seasonal Radar", 
                    Stamp = "TRANSMISSION // LIVE", 
                    Sfx = "DROP!", 
                    Title1 = "Today's", 
                    Title2 = "Drops", 
                    Kanji = "最新のリリース", 
                    Desc = "Demon Slayer Hashira Training Arc Ep 4 is out. Jump in the forums.", 
                    BtnText = "Enter The Vault", 
                    TargetUrl = "/vault",
                    ImageUrl = "/assets/fest.jpeg", 
                    DisplayOrder = 2 
                }
            );
            await db.SaveChangesAsync();
        }

        if (!await db.StoreProducts.AnyAsync())
        {
            var apparelCat = await db.StoreCategories.FirstOrDefaultAsync(c => c.Slug == "shirts") 
                ?? new StoreCategory { Name = "T-Shirts & Tops", Slug = "shirts", KanjiTitle = "上着", DisplayOrder = 1 };
            
            var headwearCat = await db.StoreCategories.FirstOrDefaultAsync(c => c.Slug == "caps") 
                ?? new StoreCategory { Name = "Caps & Headwear", Slug = "caps", KanjiTitle = "頭飾", DisplayOrder = 2 };
            
            if (apparelCat.Id == 0) db.StoreCategories.Add(apparelCat);
            if (headwearCat.Id == 0) db.StoreCategories.Add(headwearCat);
            await db.SaveChangesAsync();

            var aotDrop = await db.StoreCollectionDrops.FirstOrDefaultAsync(d => d.Slug == "survey-corps-01") 
                ?? new StoreCollectionDrop
                {
                    Title = "The Survey Corps Division // Drop 01",
                    Slug = "survey-corps-01",
                    ThemeTag = "SHINGEKI_CORE",
                    KanjiSubtitle = "調査兵団限定コレクション",
                    BannerImageUrl = "/assets/fest.jpeg",
                    IsActive = true
                };

            if (aotDrop.Id == 0) 
            { 
                db.StoreCollectionDrops.Add(aotDrop); 
                await db.SaveChangesAsync(); 
            }

            var aotTee = new StoreProduct
            {
                CategoryId = apparelCat.Id,
                CollectionDropId = aotDrop.Id,
                Title = "Wings of Freedom Heavyweight Oversized Tee",
                Slug = "aot-wings-of-freedom-tee",
                Tagline = "240 GSM Luxury Streetwear • Distressed Scout Regiment Edition",
                Description = "Heavyweight 240 GSM combed cotton tee engineered with customizable front, back, and detail view angles.",
                BasePrice = 12500.00m,
                ThumbnailUrl = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1000&auto=format&fit=crop",
                AvailableSizesJson = "[\"S\",\"M\",\"L\",\"XL\",\"XXL\"]",
                IsFeatured = true,
                IsSoldOut = false
            };
            db.StoreProducts.Add(aotTee);
            await db.SaveChangesAsync();

            db.StoreProductVariants.AddRange(
                new StoreProductVariant
                {
                    ProductId = aotTee.Id,
                    ColorName = "Obsidian Black",
                    ColorHex = "#121212",
                    AngleImagesJson = "[{\"viewAngleName\":\"Front Chest\",\"imageUrl\":\"https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1000&auto=format&fit=crop\"}]",
                    AdditionalPrice = 0.00m
                }
            );

            var otakuCap = new StoreProduct
            {
                CategoryId = headwearCat.Id,
                CollectionDropId = aotDrop.Id,
                Title = "Otaku's Domain Kanji Structured Snapback Cap",
                Slug = "otakus-domain-kanji-snapback",
                Tagline = "3D Embroidered Front Panel • Akure Sector Edition",
                Description = "High-profile structured snapback cap with reinforced wool-blend construction.",
                BasePrice = 7500.00m,
                ThumbnailUrl = "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=1000&auto=format&fit=crop",
                AvailableSizesJson = "[\"ONE SIZE\"]",
                IsFeatured = true,
                IsSoldOut = false
            };
            db.StoreProducts.Add(otakuCap);
            await db.SaveChangesAsync();

            db.StoreProductVariants.Add(new StoreProductVariant
            {
                ProductId = otakuCap.Id,
                ColorName = "Pitch Black",
                ColorHex = "#09090b",
                AngleImagesJson = "[{\"viewAngleName\":\"Front 3D Kanji\",\"imageUrl\":\"https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=1000&auto=format&fit=crop\"}]",
                AdditionalPrice = 0.00m
            });
            await db.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Background DB Warning]: {ex.Message}");
    }
});

app.Run();