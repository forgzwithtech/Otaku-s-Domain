using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.Models;
using OtakusDomainAPI.Services;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// 1. Database Configuration with Connection Resiliency
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null);
    }));

// 2. CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("OtakusDomainPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://theotakusdomain.vercel.app")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 3. Global JSON Serialization Settings (Prevents Cyclic Dependency Crashes)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// 4. Supabase JWT Auth Setup
var jwksUri = builder.Configuration["Supabase:JwksUri"] 
    ?? throw new InvalidOperationException("Supabase JWKS Uri is missing.");
var jwtIssuer = builder.Configuration["Supabase:Issuer"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKeyResolver = (token, securityToken, kid, parameters) =>
            {
                var client = new HttpClient();
                var json = client.GetStringAsync(jwksUri).Result;
                var keys = new Microsoft.IdentityModel.Tokens.JsonWebKeySet(json);
                return keys.GetSigningKeys();
            },
            ValidateIssuer = true,
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

// 5. Dependency Injection Services
builder.Services.AddHttpClient<IPaystackService, PaystackService>();
builder.Services.AddScoped<IEmailService, EmailService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("OtakusDomainPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// 6. Database Initialization & Fallback Seeding
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();

        // Seed Landing Slides
        if (!db.LandingSlides.Any())
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
                    ImageUrl = "/assets/fest.jpeg", 
                    DisplayOrder = 2 
                }
            );
            db.SaveChanges();
        }

        // Seed Store Drops & Products with AngleImagesJson
        if (!db.StoreProducts.Any())
        {
            var apparelCat = db.StoreCategories.FirstOrDefault(c => c.Slug == "shirts") ?? new StoreCategory 
            { 
                Name = "T-Shirts & Tops", 
                Slug = "shirts", 
                KanjiTitle = "上着", 
                DisplayOrder = 1 
            };
            
            var headwearCat = db.StoreCategories.FirstOrDefault(c => c.Slug == "caps") ?? new StoreCategory 
            { 
                Name = "Caps & Headwear", 
                Slug = "caps", 
                KanjiTitle = "頭飾", 
                DisplayOrder = 2 
            };
            
            if (apparelCat.Id == 0) db.StoreCategories.Add(apparelCat);
            if (headwearCat.Id == 0) db.StoreCategories.Add(headwearCat);
            db.SaveChanges();

            var aotDrop = db.StoreCollectionDrops.FirstOrDefault(d => d.Slug == "survey-corps-01") ?? new StoreCollectionDrop
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
                db.SaveChanges(); 
            }

            // 1. Attack on Titan Oversized Tee
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
            db.SaveChanges();

            var blackVariant = new StoreProductVariant
            {
                ProductId = aotTee.Id,
                ColorName = "Obsidian Black",
                ColorHex = "#121212",
                AngleImagesJson = "[{\"viewAngleName\":\"Front Chest\",\"imageUrl\":\"https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1000&auto=format&fit=crop\"},{\"viewAngleName\":\"Back Wings\",\"imageUrl\":\"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=1000&auto=format&fit=crop\"}]",
                AdditionalPrice = 0.00m
            };

            var whiteVariant = new StoreProductVariant
            {
                ProductId = aotTee.Id,
                ColorName = "Off White",
                ColorHex = "#f5f5f0",
                AngleImagesJson = "[{\"viewAngleName\":\"Front Inverted\",\"imageUrl\":\"https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=1000&auto=format&fit=crop\"},{\"viewAngleName\":\"Back Titan\",\"imageUrl\":\"https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?q=80&w=1000&auto=format&fit=crop\"}]",
                AdditionalPrice = 0.00m
            };

            db.StoreProductVariants.AddRange(blackVariant, whiteVariant);

            // 2. Otaku's Domain Snapback Cap
            var otakuCap = new StoreProduct
            {
                CategoryId = headwearCat.Id,
                CollectionDropId = aotDrop.Id,
                Title = "Otaku's Domain Kanji Structured Snapback Cap",
                Slug = "otakus-domain-kanji-snapback",
                Tagline = "3D Embroidered Front Panel • Akure Sector Edition",
                Description = "High-profile structured snapback cap with reinforced wool-blend construction and custom kanji rear embroidery.",
                BasePrice = 7500.00m,
                ThumbnailUrl = "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=1000&auto=format&fit=crop",
                AvailableSizesJson = "[\"ONE SIZE\"]",
                IsFeatured = true,
                IsSoldOut = false
            };
            db.StoreProducts.Add(otakuCap);
            db.SaveChanges();

            var capBlack = new StoreProductVariant
            {
                ProductId = otakuCap.Id,
                ColorName = "Pitch Black",
                ColorHex = "#09090b",
                AngleImagesJson = "[{\"viewAngleName\":\"Front 3D Kanji\",\"imageUrl\":\"https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=1000&auto=format&fit=crop\"},{\"viewAngleName\":\"Rear Strap\",\"imageUrl\":\"https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?q=80&w=1000&auto=format&fit=crop\"}]",
                AdditionalPrice = 0.00m
            };

            db.StoreProductVariants.Add(capBlack);
            db.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine($"[Database Init Warning]: {ex.Message}");
        Console.ResetColor();
    }
}

app.Run();