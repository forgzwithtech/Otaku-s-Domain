using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.Enums;
using OtakusDomainAPI.Models;
using OtakusDomainAPI.Services;
using System.Security.Claims;
using System.Text.Json;

namespace OtakusDomainAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPaystackService _paystack;
    private readonly IEmailService _email;
    private readonly IConfiguration _config;

    public PaymentsController(AppDbContext context, IPaystackService paystack, IEmailService email, IConfiguration config)
    {
        _context = context;
        _paystack = paystack;
        _email = email;
        _config = config;
    }

    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    // =========================================================================
    // 1. INITIALIZE TICKET / VOUCHER PAYMENT
    // =========================================================================
    public record InitTicketPaymentDto(int StageId, string? CouponCode, string GuestName, string GuestEmail);

    [HttpPost("initialize-ticket")]
    [Authorize]
    public async Task<IActionResult> InitializeTicketPayment([FromBody] InitTicketPaymentDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.UserProfiles.FindAsync(userId.Value);
        if (user == null) return NotFound("Operative dossier not found.");

        var stage = await _context.EventTicketStages
            .Include(s => s.Event)
            .FirstOrDefaultAsync(s => s.Id == dto.StageId);

        if (stage == null || !stage.IsActive)
            return BadRequest(new { message = "Selected ticket tier is unavailable." });

        var now = DateTime.UtcNow;
        if (now < stage.SalesStartTimeUtc || now > stage.SalesEndTimeUtc || stage.SoldCount >= stage.TotalCapacity)
            return BadRequest(new { message = "This stage is sold out or closed." });

        bool isPresale = stage.StageType == TicketStageType.PresaleVoucher;

        if (isPresale)
        {
            var alreadyHasPresale = await _context.EventTicketPasses.AnyAsync(p =>
                p.UserId == user.Id &&
                p.EventId == stage.EventId &&
                p.IsPresaleVoucher &&
                p.IsPaid &&
                !p.HasUpgradedToFullTicket);

            if (alreadyHasPresale)
                return BadRequest(new { message = "You already hold an active presale voucher for this event." });
        }

        decimal finalPrice = stage.BasePrice;

        if (!isPresale)
        {
            var activeVoucher = await _context.EventTicketPasses
                .Include(p => p.TicketStage)
                .Where(p => p.UserId == user.Id &&
                            p.EventId == stage.EventId &&
                            p.IsPresaleVoucher &&
                            p.IsPaid &&
                            !p.HasUpgradedToFullTicket)
                .FirstOrDefaultAsync();

            if (activeVoucher != null)
            {
                finalPrice = Math.Max(0, finalPrice - activeVoucher.TicketStage!.PresaleDiscountValue);
            }
        }

        if (!string.IsNullOrWhiteSpace(dto.CouponCode))
        {
            var clean = dto.CouponCode.Trim().ToUpper();
            var coupon = await _context.EventCoupons
                .FirstOrDefaultAsync(c => c.Code == clean && c.IsActive && c.ExpiryDateUtc >= now && c.CurrentUses < c.MaxUses);

            if (coupon != null)
            {
                if (coupon.DiscountPercent > 0)
                    finalPrice -= (finalPrice * (coupon.DiscountPercent / 100m));
                else if (coupon.FlatDiscountAmount > 0)
                    finalPrice = Math.Max(0, finalPrice - coupon.FlatDiscountAmount);
            }
        }

        var reference = $"OD_EVT_{Guid.NewGuid().ToString("N")[..12].ToUpper()}";
        var callbackUrl = _config["Paystack:CallbackUrl"] ?? "https://otaku-s-domain.onrender.com/events/payment-success";

        var pass = new EventTicketPass
        {
            EventId = stage.EventId,
            TicketStageId = stage.Id,
            UserId = user.Id,
            GuestName = !string.IsNullOrWhiteSpace(dto.GuestName) ? dto.GuestName : (user.DisplayName ?? user.Username),
            GuestEmail = !string.IsNullOrWhiteSpace(dto.GuestEmail) ? dto.GuestEmail : user.Email,
            PurchaseAmount = finalPrice,
            IsPresaleVoucher = isPresale,
            HasUpgradedToFullTicket = false,
            PaymentReference = reference,
            IsPaid = false,
            Status = TicketStatus.Active
        };
        _context.EventTicketPasses.Add(pass);

        var tx = new PaymentTransaction
        {
            Reference = reference,
            UserId = user.Id,
            CustomerEmail = pass.GuestEmail,
            AmountPaid = finalPrice,
            PaymentType = isPresale ? PaymentPurpose.EventPresaleVoucher : PaymentPurpose.EventTicket,
            RelatedEntityId = pass.Id.ToString(),
            Status = TransactionPaymentStatus.Pending
        };
        _context.PaymentTransactions.Add(tx);

        await _context.SaveChangesAsync();

        var paystackRes = await _paystack.InitializePaymentAsync(
            pass.GuestEmail,
            finalPrice,
            reference,
            callbackUrl,
            new { passId = pass.Id, userId = user.Id, eventId = stage.EventId, isPresale }
        );

        return Ok(new
        {
            authorizationUrl = paystackRes?.Data?.AuthorizationUrl,
            reference = reference,
            passId = pass.Id
        });
    }

    // =========================================================================
    // 2. HARDENED PAYMENT VERIFICATION (EVENTS & STORE ORDERS)
    // =========================================================================
    [HttpGet("verify")]
    [Authorize]
    public async Task<IActionResult> VerifyPayment([FromQuery] string reference)
    {
        if (string.IsNullOrWhiteSpace(reference)) return BadRequest("Transaction reference is required.");

        var tx = await _context.PaymentTransactions.FirstOrDefaultAsync(t => t.Reference == reference);
        if (tx == null) return NotFound(new { success = false, isPaid = false, message = "Transaction record not found in ledger." });

        // If not marked success in our DB yet, verify LIVE with Paystack Gateway
        if (tx.Status != TransactionPaymentStatus.Success)
        {
            var paystackVerify = await _paystack.VerifyTransactionAsync(reference);
            if (paystackVerify != null && paystackVerify.Data != null && paystackVerify.Data.Status.Equals("success", StringComparison.OrdinalIgnoreCase))
            {
                if (tx.PaymentType == PaymentPurpose.StoreOrder)
                {
                    await ProcessStorePaymentSuccessAsync(tx, paystackVerify.Data);
                }
                else
                {
                    var pass = await _context.EventTicketPasses
                        .Include(p => p.Event)
                        .Include(p => p.TicketStage)
                        .Include(p => p.User)
                        .FirstOrDefaultAsync(p => p.PaymentReference == reference);

                    if (pass != null)
                    {
                        await ProcessTicketPaymentSuccessAsync(pass, paystackVerify.Data);
                    }
                }
            }
            else
            {
                // If Paystack reports failure/abandonment
                if (paystackVerify?.Data?.Status == "failed" || paystackVerify?.Data?.Status == "abandoned")
                {
                    tx.Status = paystackVerify.Data.Status == "failed" ? TransactionPaymentStatus.Failed : TransactionPaymentStatus.Abandoned;
                    await _context.SaveChangesAsync();
                }

                return Ok(new 
                { 
                    success = false, 
                    isPaid = false, 
                    message = $"Payment gateway status: {paystackVerify?.Data?.Status ?? "unverified"}" 
                });
            }
        }

        // Return verified payload
        if (tx.PaymentType == PaymentPurpose.StoreOrder)
        {
            var order = await _context.StoreOrders
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(o => o.PaymentReference == reference);

            return Ok(new
            {
                success = true,
                isPaid = true,
                paymentType = "StoreOrder",
                orderNumber = order?.OrderNumber,
                totalAmount = order?.TotalAmount,
                deliveryFee = order?.DeliveryFee,
                akureZone = order?.AkureZone,
                shippingAddress = order?.ShippingAddress
            });
        }

        var passRecord = await _context.EventTicketPasses
            .Include(p => p.Event)
            .Include(p => p.TicketStage)
            .FirstOrDefaultAsync(p => p.PaymentReference == reference);

        return Ok(new
        {
            success = true,
            isPaid = true,
            paymentType = "EventPass",
            ticketId = passRecord?.Id,
            isPresale = passRecord?.IsPresaleVoucher ?? false,
            stageName = passRecord?.TicketStage?.StageName ?? "General",
            eventTitle = passRecord?.Event?.Title ?? "Guild Event",
            eventDateUtc = passRecord?.Event?.EventDateUtc,
            guestName = passRecord?.GuestName,
            finalPrice = passRecord?.PurchaseAmount,
            discountLocked = (passRecord != null && passRecord.IsPresaleVoucher) ? (passRecord.TicketStage?.PresaleDiscountValue ?? 0) : 0
        });
    }

    // =========================================================================
    // 3. PAYSTACK WEBHOOK LISTENER
    // =========================================================================
    [HttpPost("paystack-webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> PaystackWebhook()
    {
        using var reader = new StreamReader(Request.Body);
        var jsonBody = await reader.ReadToEndAsync();
        var signature = Request.Headers["x-paystack-signature"].ToString();

        if (!_paystack.VerifyWebhookSignature(jsonBody, signature))
            return Unauthorized("Invalid webhook signature.");

        using var doc = JsonDocument.Parse(jsonBody);
        var root = doc.RootElement;
        var eventType = root.GetProperty("event").GetString();

        if (eventType == "charge.success")
        {
            var data = root.GetProperty("data");
            var reference = data.GetProperty("reference").GetString();

            var tx = await _context.PaymentTransactions.FirstOrDefaultAsync(t => t.Reference == reference);
            if (tx != null && tx.Status != TransactionPaymentStatus.Success)
            {
                var verifyData = new PaystackVerifyData
                {
                    Id = data.GetProperty("id").GetInt64(),
                    Status = "success",
                    Reference = reference ?? "",
                    AmountInKobo = data.GetProperty("amount").GetInt64(),
                    Channel = data.TryGetProperty("channel", out var ch) ? ch.GetString() ?? "" : "",
                    PaidAt = DateTime.UtcNow
                };

                if (tx.PaymentType == PaymentPurpose.StoreOrder)
                {
                    await ProcessStorePaymentSuccessAsync(tx, verifyData);
                }
                else
                {
                    var pass = await _context.EventTicketPasses
                        .Include(p => p.Event)
                        .Include(p => p.TicketStage)
                        .Include(p => p.User)
                        .FirstOrDefaultAsync(p => p.PaymentReference == reference);

                    if (pass != null)
                    {
                        await ProcessTicketPaymentSuccessAsync(pass, verifyData);
                    }
                }
            }
        }

        return Ok();
    }

    // =========================================================================
    // HELPERS: ATOMIC SUCCESS HANDLERS
    // =========================================================================
    private async Task ProcessTicketPaymentSuccessAsync(EventTicketPass pass, PaystackVerifyData verifyData)
    {
        pass.IsPaid = true;
        if (pass.TicketStage != null) pass.TicketStage.SoldCount++;

        if (pass.User != null)
        {
            pass.User.QuestPoints += pass.IsPresaleVoucher ? 50 : 100;
            pass.User.EventCredits += 25.00m;
        }

        if (!pass.IsPresaleVoucher)
        {
            var voucher = await _context.EventTicketPasses
                .Where(p => p.UserId == pass.UserId &&
                            p.EventId == pass.EventId &&
                            p.IsPresaleVoucher &&
                            !p.HasUpgradedToFullTicket &&
                            p.IsPaid)
                .FirstOrDefaultAsync();

            if (voucher != null) voucher.HasUpgradedToFullTicket = true;
        }

        var tx = await _context.PaymentTransactions.FirstOrDefaultAsync(t => t.Reference == pass.PaymentReference);
        if (tx != null)
        {
            tx.Status = TransactionPaymentStatus.Success;
            tx.PaystackTransactionId = verifyData.Id.ToString();
            tx.Channel = verifyData.Channel;
            tx.PaidAtUtc = verifyData.PaidAt ?? DateTime.UtcNow;
            tx.GatewayResponseJson = JsonSerializer.Serialize(verifyData);
        }

        await _context.SaveChangesAsync();

        if (pass.IsPresaleVoucher)
        {
            await _email.SendPresaleConfirmationEmailAsync(
                pass.GuestEmail,
                pass.GuestName,
                pass.Event?.Title ?? "Otaku's Domain Event",
                pass.TicketStage?.PresaleDiscountValue ?? 0,
                pass.PurchaseAmount
            );
        }
        else
        {
            await _email.SendTicketPassEmailAsync(
                pass.GuestEmail,
                pass.GuestName,
                pass.Event?.Title ?? "Otaku's Domain Event",
                pass.TicketStage?.StageName ?? "Standard",
                pass.Id,
                pass.Event?.EventDateUtc ?? DateTime.UtcNow.AddDays(30),
                pass.Event?.VenueAddress ?? pass.Event?.LocationName ?? "Akure"
            );
        }
    }

    private async Task ProcessStorePaymentSuccessAsync(PaymentTransaction tx, PaystackVerifyData verifyData)
    {
        tx.Status = TransactionPaymentStatus.Success;
        tx.PaystackTransactionId = verifyData.Id.ToString();
        tx.Channel = verifyData.Channel;
        tx.PaidAtUtc = verifyData.PaidAt ?? DateTime.UtcNow;
        tx.GatewayResponseJson = JsonSerializer.Serialize(verifyData);

        var order = await _context.StoreOrders
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.PaymentReference == tx.Reference);

        if (order != null)
        {
            order.IsPaid = true;
            order.OrderStatus = OrderStatus.Paid;

            var user = await _context.UserProfiles.FindAsync(order.UserId);
            if (user != null)
            {
                user.QuestPoints += (int)(order.TotalAmount / 100);
            }

            await _context.SaveChangesAsync();

            var itemsSummary = string.Join("<br/>", order.Items.Select(i => 
                $"• <strong>{i.Product?.Title ?? "Merch"}</strong> ({i.SelectedColor}, Size {i.SelectedSize}) x{i.Quantity} — ₦{i.UnitPrice:N0}"));

            await _email.SendStoreOrderReceiptEmailAsync(
                order.CustomerEmail,
                order.CustomerName,
                order.OrderNumber,
                order.TotalAmount,
                order.DeliveryFee,
                order.ShippingAddress,
                order.AkureZone,
                itemsSummary
            );
        }
    }
}