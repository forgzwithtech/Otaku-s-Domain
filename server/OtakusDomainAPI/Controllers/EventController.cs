using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.Enums;
using OtakusDomainAPI.Models;
using System.Security.Claims;

namespace OtakusDomainAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventsController : ControllerBase
{
    private readonly AppDbContext _context;

    public EventsController(AppDbContext context)
    {
        _context = context;
    }

    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    // =========================================================================
    // 1. GET ALL ACTIVE / SCHEDULED EVENTS (WITH TIME EXPIRY & PRICE MASKING)
    // =========================================================================
   [HttpGet]
public async Task<IActionResult> GetAllEvents()
{
    var now = DateTime.UtcNow;
    var list = await _context.GuildEvents
        .Include(e => e.TicketStages)
        .OrderByDescending(e => e.IsActive)
        .ThenBy(e => e.DisplayOrder) // <-- Lower numbers appear first (e.g. 0, 1, 2)
        .ThenBy(e => e.EventDateUtc)
        .Select(e => new
        {
            e.Id,
            e.Title,
            e.Slug,
            e.Tagline,
            e.Description,
            e.LocationName,
            e.VenueAddress,
            e.EventDateUtc,
            e.CoverImageUrl,
            e.MediaHypeReelsJson,
            e.IsActive,
            e.DisplayOrder,
            PresaleStage = e.TicketStages
                .Where(s => s.StageType == TicketStageType.PresaleVoucher && s.IsActive)
                .Select(s => new
                {
                    s.Id,
                    s.StageName,
                    s.BasePrice,
                    s.PresaleDiscountValue,
                    s.TotalCapacity,
                    s.SoldCount,
                    Remaining = Math.Max(0, s.TotalCapacity - s.SoldCount),
                    IsSoldOut = s.SoldCount >= s.TotalCapacity || now > s.SalesEndTimeUtc,
                    IsOpen = now >= s.SalesStartTimeUtc && now <= s.SalesEndTimeUtc && s.SoldCount < s.TotalCapacity,
                    IsUpcoming = now < s.SalesStartTimeUtc,
                    s.SalesStartTimeUtc,
                    s.SalesEndTimeUtc
                })
                .FirstOrDefault(),
            AdmissionStages = e.TicketStages
                .Where(s => s.StageType != TicketStageType.PresaleVoucher && s.IsActive)
                .OrderBy(s => s.BasePrice)
                .Select(s => new
                {
                    s.Id,
                    s.StageName,
                    StageType = s.StageType.ToString(),
                    BasePrice = (s.HidePriceUntilActive && now < s.SalesStartTimeUtc) ? (decimal?)null : s.BasePrice,
                    s.TotalCapacity,
                    s.SoldCount,
                    Remaining = Math.Max(0, s.TotalCapacity - s.SoldCount),
                    IsSoldOut = s.SoldCount >= s.TotalCapacity || now > s.SalesEndTimeUtc,
                    IsOpen = now >= s.SalesStartTimeUtc && now <= s.SalesEndTimeUtc && s.SoldCount < s.TotalCapacity,
                    IsUpcoming = now < s.SalesStartTimeUtc,
                    s.HidePriceUntilActive,
                    s.SalesStartTimeUtc,
                    s.SalesEndTimeUtc
                })
                .ToList()
        })
        .ToListAsync();

    return Ok(list);
}

    // =========================================================================
    // 2. CHECK VERIFIED PRESALE VOUCHER STATUS (REQUIRES IsPaid == true)
    // =========================================================================
    [HttpGet("my-presale-status")]
    [Authorize]
    public async Task<IActionResult> GetMyPresaleStatus([FromQuery] int eventId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var presalePass = await _context.EventTicketPasses
            .Include(p => p.TicketStage)
            .Where(p => p.UserId == userId.Value && 
                        p.EventId == eventId && 
                        p.IsPresaleVoucher && 
                        p.IsPaid &&
                        !p.HasUpgradedToFullTicket &&
                        p.Status == TicketStatus.Active)
            .FirstOrDefaultAsync();

        if (presalePass == null)
            return Ok(new { hasPresaleDiscount = false, discountAmount = 0.00m });

        return Ok(new
        {
            hasPresaleDiscount = true,
            presaleTicketId = presalePass.Id,
            discountAmount = presalePass.TicketStage?.PresaleDiscountValue ?? 0.00m
        });
    }

    // =========================================================================
    // 3. PURCHASE PASS OR ADVANCE VOUCHER
    // =========================================================================
    public record PurchaseTicketDto(int StageId, string? CouponCode, string GuestName, string GuestEmail);

    [HttpPost("purchase-ticket")]
    [Authorize]
    public async Task<IActionResult> PurchaseTicket([FromBody] PurchaseTicketDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.UserProfiles.FindAsync(userId.Value);
        if (user == null) return NotFound("Operative dossier not found.");

        var stage = await _context.EventTicketStages
            .Include(s => s.Event)
            .FirstOrDefaultAsync(s => s.Id == dto.StageId);

        if (stage == null || !stage.IsActive)
            return BadRequest(new { message = "Selected tier is unavailable." });

        var now = DateTime.UtcNow;
        if (now < stage.SalesStartTimeUtc || now > stage.SalesEndTimeUtc || stage.SoldCount >= stage.TotalCapacity)
        {
            return BadRequest(new { message = "This ticket tier is currently SOLD OUT or closed." });
        }

        bool isBuyingPresaleVoucher = stage.StageType == TicketStageType.PresaleVoucher;

        // Prevent purchasing multiple active presale vouchers for the same event
        if (isBuyingPresaleVoucher)
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

        // If buying admission, apply presale voucher discount if held
        EventTicketPass? activeVoucher = null;
        if (!isBuyingPresaleVoucher)
        {
            activeVoucher = await _context.EventTicketPasses
                .Include(p => p.TicketStage)
                .Where(p => p.UserId == user.Id && 
                            p.EventId == stage.EventId && 
                            p.IsPresaleVoucher && 
                            p.IsPaid &&
                            !p.HasUpgradedToFullTicket && 
                            p.Status == TicketStatus.Active)
                .FirstOrDefaultAsync();

            if (activeVoucher != null)
            {
                finalPrice = Math.Max(0, finalPrice - activeVoucher.TicketStage!.PresaleDiscountValue);
                activeVoucher.HasUpgradedToFullTicket = true;
            }
        }

        // Apply promo coupon code
        if (!string.IsNullOrWhiteSpace(dto.CouponCode))
        {
            var cleanCode = dto.CouponCode.Trim().ToUpper();
            var coupon = await _context.EventCoupons
                .FirstOrDefaultAsync(c => c.Code == cleanCode && c.IsActive && c.ExpiryDateUtc >= now && c.CurrentUses < c.MaxUses);

            if (coupon != null)
            {
                if (coupon.DiscountPercent > 0)
                    finalPrice -= (finalPrice * (coupon.DiscountPercent / 100m));
                else if (coupon.FlatDiscountAmount > 0)
                    finalPrice = Math.Max(0, finalPrice - coupon.FlatDiscountAmount);

                coupon.CurrentUses++;
            }
        }

        // Generate Ticket Pass record
        var pass = new EventTicketPass
        {
            EventId = stage.EventId,
            TicketStageId = stage.Id,
            UserId = user.Id,
            GuestName = !string.IsNullOrWhiteSpace(dto.GuestName) ? dto.GuestName : (user.DisplayName ?? user.Username),
            GuestEmail = !string.IsNullOrWhiteSpace(dto.GuestEmail) ? dto.GuestEmail : user.Email,
            PurchaseAmount = finalPrice,
            IsPresaleVoucher = isBuyingPresaleVoucher,
            HasUpgradedToFullTicket = false,
            IsPaid = true,
            Status = TicketStatus.Active
        };

        stage.SoldCount++;
        _context.EventTicketPasses.Add(pass);

        // Award QP and Credits
        user.QuestPoints += isBuyingPresaleVoucher ? 50 : 100;
        user.EventCredits += 25.00m;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            ticketId = pass.Id,
            isPresale = pass.IsPresaleVoucher,
            discountLocked = isBuyingPresaleVoucher ? stage.PresaleDiscountValue : 0,
            finalPrice,
            message = isBuyingPresaleVoucher 
                ? $"Presale voucher secured! ₦{stage.PresaleDiscountValue:N0} discount locked to your account."
                : "Admission pass confirmed! Gate entry QR code generated."
        });
    }

    // =========================================================================
    // 4. CONTEXT-AWARE GATEKEEPER QR SCANNER (EVENT & TIER BOUND)
    // =========================================================================
    public record ScanTicketDto(
        Guid TicketId,
        int EventId,
        int? RequiredStageId = null
    );

    [HttpPost("gatekeeper-scan")]
    [Authorize]
    public async Task<IActionResult> ScanTicket([FromBody] ScanTicketDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var officer = await _context.UserProfiles.FindAsync(userId.Value);
        if (officer == null || (officer.Role != UserRole.Admin && officer.Role != UserRole.Moderator))
            return StatusCode(StatusCodes.Status403Forbidden, new { valid = false, message = "Restricted: Officer clearance required." });

        var ticket = await _context.EventTicketPasses
            .Include(p => p.Event)
            .Include(p => p.TicketStage)
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == dto.TicketId);

        if (ticket == null)
            return NotFound(new { valid = false, message = "INVALID PASS // RECORD NOT FOUND" });

        // 1. Check Event Matching
        if (ticket.EventId != dto.EventId)
        {
            return BadRequest(new
            {
                valid = false,
                message = $"WRONG EVENT: This ticket is for '{ticket.Event?.Title}', not the current active gate!"
            });
        }

        // 2. Check Payment Status
        if (!ticket.IsPaid)
            return BadRequest(new { valid = false, message = "UNPAID TICKET // TRANSACTION PENDING OR FAILED" });

        // 3. Reject Un-Upgraded Presale Vouchers
        if (ticket.IsPresaleVoucher && !ticket.HasUpgradedToFullTicket)
        {
            return BadRequest(new
            {
                valid = false,
                message = "PRESALE VOUCHER ONLY: Operative must upgrade to an admission ticket before entry!"
            });
        }

        // 4. Check Tier Enforcement (If Gatekeeper selected a specific tier gate)
        if (dto.RequiredStageId.HasValue && dto.RequiredStageId.Value > 0)
        {
            if (ticket.TicketStageId != dto.RequiredStageId.Value)
            {
                return BadRequest(new
                {
                    valid = false,
                    message = $"TIER MISMATCH: Pass is for '{ticket.TicketStage?.StageName}'. Access to this gate is restricted!"
                });
            }
        }

        // 5. Check if already used
        if (ticket.Status == TicketStatus.CheckedIn)
        {
            return BadRequest(new
            {
                valid = false,
                alreadyCheckedIn = true,
                guest = ticket.GuestName,
                stage = ticket.TicketStage?.StageName,
                message = $"ALREADY USED: Checked in at {ticket.CheckedInAt:g} by {ticket.CheckedInByOfficer}"
            });
        }

        // Process Check-in
        ticket.Status = TicketStatus.CheckedIn;
        ticket.CheckedInAt = DateTime.UtcNow;
        ticket.CheckedInByOfficer = officer.DisplayName ?? officer.Username;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            valid = true,
            guest = ticket.GuestName,
            email = ticket.GuestEmail,
            faction = ticket.User?.Faction.ToString() ?? "None",
            stage = ticket.TicketStage?.StageName,
            eventTitle = ticket.Event?.Title,
            checkedInAt = ticket.CheckedInAt,
            message = "ACCESS GRANTED // CLEARANCE VERIFIED"
        });
    }
}