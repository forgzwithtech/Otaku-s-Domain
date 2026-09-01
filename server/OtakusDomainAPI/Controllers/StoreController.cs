using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.Models;
using OtakusDomainAPI.Services;
using System.Security.Claims;

namespace OtakusDomainAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StoreController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPaystackService _paystack;
    private readonly IConfiguration _config;

    public StoreController(AppDbContext context, IPaystackService paystack, IConfiguration config)
    {
        _context = context;
        _paystack = paystack;
        _config = config;
    }

    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpGet("catalog")]
    public async Task<IActionResult> GetCatalog([FromQuery] string? categorySlug)
    {
        var query = _context.StoreProducts
            .Include(p => p.Category)
            .Include(p => p.ColorVariants)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(categorySlug))
            query = query.Where(p => p.Category != null && p.Category.Slug == categorySlug.Trim().ToLower());

        var products = await query
            .OrderByDescending(p => p.IsFeatured)
            .ThenByDescending(p => p.CreatedAt)
            .ToListAsync();

        var categories = await _context.StoreCategories
            .Where(c => c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync();

        return Ok(new { products, categories });
    }

    [HttpGet("product/{slug}")]
    public async Task<IActionResult> GetProductBySlug(string slug)
    {
        var product = await _context.StoreProducts
            .Include(p => p.Category)
            .Include(p => p.ColorVariants)
            .FirstOrDefaultAsync(p => p.Slug == slug.Trim().ToLower());

        if (product == null) return NotFound("Product not found.");
        return Ok(product);
    }

    public record CreateOrderItemDto(int ProductId, string SelectedColor, string SelectedSize, int Quantity, string? CustomizationDetailsJson);
    public record CheckoutStoreDto(
        string CustomerName,
        string CustomerEmail,
        string CustomerPhone,
        string ShippingAddress,
        string AkureZone,
        List<CreateOrderItemDto> Items
    );

    [HttpPost("checkout")]
    [Authorize]
    public async Task<IActionResult> Checkout([FromBody] CheckoutStoreDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (dto.Items == null || dto.Items.Count == 0)
            return BadRequest("Cart is empty.");

        decimal subtotal = 0;
        var orderItems = new List<StoreOrderItem>();

        foreach (var item in dto.Items)
        {
            var product = await _context.StoreProducts.FindAsync(item.ProductId);
            if (product == null || product.IsSoldOut)
                return BadRequest($"Product '{item.ProductId}' is currently sold out.");

            decimal itemCost = product.BasePrice * item.Quantity;
            subtotal += itemCost;

            orderItems.Add(new StoreOrderItem
            {
                ProductId = product.Id,
                SelectedColor = item.SelectedColor,
                SelectedSize = item.SelectedSize,
                UnitPrice = product.BasePrice,
                Quantity = item.Quantity,
                CustomizationDetailsJson = item.CustomizationDetailsJson
            });
        }

        decimal deliveryFee = 1500.00m;
        decimal totalAmount = subtotal + deliveryFee;

        var orderNumber = $"OD-AKR-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";
        var reference = $"OD_MERCH_{Guid.NewGuid().ToString("N")[..12].ToUpper()}";
        var callbackUrl = _config["Paystack:StoreCallbackUrl"] ?? "https://theotakusdomain.vercel.app/store/order-success";

        var order = new StoreOrder
        {
            OrderNumber = orderNumber,
            UserId = userId.Value,
            CustomerName = dto.CustomerName,
            CustomerEmail = dto.CustomerEmail,
            CustomerPhone = dto.CustomerPhone,
            ShippingAddress = dto.ShippingAddress,
            AkureZone = dto.AkureZone ?? "FUTA South Gate Area",
            City = "Akure",
            State = "Ondo State",
            Subtotal = subtotal,
            DeliveryFee = deliveryFee,
            TotalAmount = totalAmount,
            PaymentReference = reference,
            OrderStatus = OrderStatus.Pending,
            IsPaid = false,
            Items = orderItems
        };
        _context.StoreOrders.Add(order);

        var tx = new PaymentTransaction
        {
            Reference = reference,
            UserId = userId.Value,
            CustomerEmail = dto.CustomerEmail,
            AmountPaid = totalAmount,
            PaymentType = PaymentPurpose.StoreOrder,
            RelatedEntityId = order.Id.ToString(),
            Status = TransactionPaymentStatus.Pending
        };
        _context.PaymentTransactions.Add(tx);

        await _context.SaveChangesAsync();

        var paystackRes = await _paystack.InitializePaymentAsync(
            dto.CustomerEmail,
            totalAmount,
            reference,
            callbackUrl,
            new { orderId = order.Id, orderNumber = order.OrderNumber }
        );

        return Ok(new
        {
            authorizationUrl = paystackRes?.Data?.AuthorizationUrl,
            orderNumber = order.OrderNumber,
            reference
        });
    }
    
}