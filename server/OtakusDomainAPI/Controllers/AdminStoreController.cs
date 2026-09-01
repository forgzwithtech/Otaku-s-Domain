using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.Enums;
using OtakusDomainAPI.Models;
using OtakusDomainAPI.Services;
using System.Security.Claims;

namespace OtakusDomainAPI.Controllers;

[ApiController]
[Route("api/admin/store")]
[Authorize]
public class AdminStoreController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IEmailService _email;

    public AdminStoreController(AppDbContext context, IEmailService email)
    {
        _context = context;
        _email = email;
    }

    private async Task<bool> IsAdminOrModAsync()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return false;
        var user = await _context.UserProfiles.FindAsync(userId);
        return user != null && (user.Role == UserRole.Admin || user.Role == UserRole.Moderator);
    }

    // =========================================================================
    // 1. ORDERS DASHBOARD (FULL ITEM BREAKDOWN)
    // =========================================================================
    // =========================================================================
    // 1. ORDERS DASHBOARD (STRICTLY PAID ORDERS ONLY)
    // =========================================================================
    [HttpGet("orders")]
    public async Task<IActionResult> GetAllOrders([FromQuery] string? status, [FromQuery] bool includeUnpaid = false)
    {
        if (!await IsAdminOrModAsync()) return Forbid();

        var query = _context.StoreOrders
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .OrderByDescending(o => o.CreatedAt)
            .AsQueryable();

        // STRICT FILTER: Only show paid orders unless explicitly requested
        if (!includeUnpaid)
        {
            query = query.Where(o => o.IsPaid && o.OrderStatus != OrderStatus.Pending);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, true, out var filterStatus))
        {
            query = query.Where(o => o.OrderStatus == filterStatus);
        }

        var orders = await query.Select(o => new
        {
            o.Id,
            o.OrderNumber,
            o.CustomerName,
            o.CustomerEmail,
            o.CustomerPhone,
            o.ShippingAddress,
            o.AkureZone,
            o.Subtotal,
            o.DeliveryFee,
            o.TotalAmount,
            OrderStatus = o.OrderStatus.ToString(),
            o.IsPaid,
            o.PaymentReference,
            o.CreatedAt,
            Items = o.Items.Select(i => new
            {
                i.Id,
                ProductId = i.ProductId,
                ProductTitle = i.Product != null ? i.Product.Title : "Custom Merch",
                ProductThumbnail = i.Product != null ? i.Product.ThumbnailUrl : "",
                i.SelectedColor,
                i.SelectedSize,
                i.UnitPrice,
                i.Quantity,
                i.CustomizationDetailsJson
            }).ToList()
        }).ToListAsync();

        return Ok(orders);
    }
    public record SendDispatchUpdateDto(Guid OrderId, string StatusHeadline, string CustomNote, string? NewOrderStatus, string? RiderContact);

    [HttpPost("orders/send-dispatch-update")]
    public async Task<IActionResult> SendDispatchUpdate([FromBody] SendDispatchUpdateDto dto)
    {
        if (!await IsAdminOrModAsync()) return Forbid();
        var order = await _context.StoreOrders.FindAsync(dto.OrderId);
        if (order == null) return NotFound("Order not found.");

        if (!string.IsNullOrWhiteSpace(dto.NewOrderStatus) && Enum.TryParse<OrderStatus>(dto.NewOrderStatus, true, out var parsedStatus))
        {
            order.OrderStatus = parsedStatus;
            await _context.SaveChangesAsync();
        }

        await _email.SendStoreDeliveryUpdateEmailAsync(
            order.CustomerEmail,
            order.CustomerName,
            order.OrderNumber,
            dto.StatusHeadline,
            dto.CustomNote,
            order.ShippingAddress,
            order.AkureZone,
            dto.RiderContact
        );

        return Ok(new { success = true });
    }

    // =========================================================================
    // 2. PRODUCT MANAGEMENT
    // =========================================================================
    public record UpsertProductDto(
        int? Id,
        int CategoryId,
        string Title,
        string Slug,
        string? Tagline,
        string Description,
        decimal BasePrice,
        string ThumbnailUrl,
        string? AvailableSizesJson,
        bool? IsFeatured,
        bool? IsSoldOut
    );

    [HttpPost("products")]
    public async Task<IActionResult> SaveProduct([FromBody] UpsertProductDto dto)
    {
        if (!await IsAdminOrModAsync()) return Forbid();

        var cleanSlug = !string.IsNullOrWhiteSpace(dto.Slug)
            ? dto.Slug.Trim().ToLower().Replace(" ", "-")
            : dto.Title.Trim().ToLower().Replace(" ", "-");

        if (dto.Id.HasValue && dto.Id.Value > 0)
        {
            var existing = await _context.StoreProducts.FindAsync(dto.Id.Value);
            if (existing == null) return NotFound();

            existing.CategoryId = dto.CategoryId > 0 ? dto.CategoryId : 1;
            existing.Title = dto.Title.Trim();
            existing.Slug = cleanSlug;
            existing.Tagline = dto.Tagline;
            existing.Description = dto.Description;
            existing.BasePrice = dto.BasePrice;
            existing.ThumbnailUrl = dto.ThumbnailUrl;
            existing.AvailableSizesJson = dto.AvailableSizesJson ?? "[\"S\",\"M\",\"L\",\"XL\",\"XXL\"]";
            existing.IsFeatured = dto.IsFeatured ?? false;
            existing.IsSoldOut = dto.IsSoldOut ?? false;
        }
        else
        {
            var p = new StoreProduct
            {
                CategoryId = dto.CategoryId > 0 ? dto.CategoryId : 1,
                Title = dto.Title.Trim(),
                Slug = cleanSlug,
                Tagline = dto.Tagline,
                Description = dto.Description,
                BasePrice = dto.BasePrice,
                ThumbnailUrl = dto.ThumbnailUrl,
                AvailableSizesJson = dto.AvailableSizesJson ?? "[\"S\",\"M\",\"L\",\"XL\",\"XXL\"]",
                IsFeatured = dto.IsFeatured ?? false,
                IsSoldOut = dto.IsSoldOut ?? false
            };
            _context.StoreProducts.Add(p);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpDelete("products/{id}")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        if (!await IsAdminOrModAsync()) return Forbid();
        var p = await _context.StoreProducts.Include(p => p.ColorVariants).FirstOrDefaultAsync(p => p.Id == id);
        if (p == null) return NotFound();
        _context.StoreProducts.Remove(p);
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // =========================================================================
    // 3. COLOR & DYNAMIC ANGLE VIEW VARIANTS
    // =========================================================================
    public record UpsertVariantDto(
        int? Id,
        int ProductId,
        string ColorName,
        string ColorHex,
        string AngleImagesJson,
        decimal? AdditionalPrice
    );

    [HttpPost("variants")]
    public async Task<IActionResult> SaveVariant([FromBody] UpsertVariantDto dto)
    {
        if (!await IsAdminOrModAsync()) return Forbid();

        if (dto.Id.HasValue && dto.Id.Value > 0)
        {
            var existing = await _context.StoreProductVariants.FindAsync(dto.Id.Value);
            if (existing == null) return NotFound("Variant not found.");

            existing.ColorName = dto.ColorName;
            existing.ColorHex = dto.ColorHex;
            existing.AngleImagesJson = dto.AngleImagesJson ?? "[]";
            existing.AdditionalPrice = dto.AdditionalPrice ?? 0;
        }
        else
        {
            var v = new StoreProductVariant
            {
                ProductId = dto.ProductId,
                ColorName = dto.ColorName,
                ColorHex = dto.ColorHex,
                AngleImagesJson = dto.AngleImagesJson ?? "[]",
                AdditionalPrice = dto.AdditionalPrice ?? 0
            };
            _context.StoreProductVariants.Add(v);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpDelete("variants/{id}")]
    public async Task<IActionResult> DeleteVariant(int id)
    {
        if (!await IsAdminOrModAsync()) return Forbid();
        var v = await _context.StoreProductVariants.FindAsync(id);
        if (v == null) return NotFound("Variant not found.");
        _context.StoreProductVariants.Remove(v);
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // =========================================================================
    // 4. CATEGORY MANAGEMENT
    // =========================================================================
    [HttpGet("categories")]
    public async Task<IActionResult> GetAdminCategories()
    {
        if (!await IsAdminOrModAsync()) return Forbid();
        var list = await _context.StoreCategories.OrderBy(c => c.DisplayOrder).ToListAsync();
        return Ok(list);
    }

    [HttpPost("categories")]
    public async Task<IActionResult> SaveCategory([FromBody] StoreCategory category)
    {
        if (!await IsAdminOrModAsync()) return Forbid();

        category.Slug = category.Slug.Trim().ToLower().Replace(" ", "-");
        if (category.Id > 0)
        {
            var existing = await _context.StoreCategories.FindAsync(category.Id);
            if (existing == null) return NotFound();

            existing.Name = category.Name.Trim();
            existing.Slug = category.Slug;
            existing.KanjiTitle = category.KanjiTitle;
            existing.Description = category.Description;
            existing.DisplayOrder = category.DisplayOrder;
            existing.IsActive = category.IsActive;
        }
        else
        {
            _context.StoreCategories.Add(category);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, category });
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        if (!await IsAdminOrModAsync()) return Forbid();
        var cat = await _context.StoreCategories.Include(c => c.Products).FirstOrDefaultAsync(c => c.Id == id);
        if (cat == null) return NotFound();
        if (cat.Products.Count > 0) return BadRequest("Cannot delete category containing active products.");

        _context.StoreCategories.Remove(cat);
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }
}