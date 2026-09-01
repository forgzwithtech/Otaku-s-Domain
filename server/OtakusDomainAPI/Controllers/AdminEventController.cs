using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.Enums;
using OtakusDomainAPI.Models;
using System.Security.Claims;

namespace OtakusDomainAPI.Controllers;

[ApiController]
[Route("api/admin/events")]
[Authorize]
public class AdminEventsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminEventsController(AppDbContext context)
    {
        _context = context;
    }

    private async Task<bool> IsAdminOrModAsync()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return false;
        var user = await _context.UserProfiles.FindAsync(userId);
        return user != null && (user.Role == UserRole.Admin || user.Role == UserRole.Moderator);
    }

    // 1. Get Live Attendee Roster
    [HttpGet("{id}/roster")]
    public async Task<IActionResult> GetEventRoster(int id)
    {
        if (!await IsAdminOrModAsync()) return Forbid();

        var passes = await _context.EventTicketPasses
            .Include(p => p.TicketStage)
            .Include(p => p.User)
            .Where(p => p.EventId == id)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                p.Id,
                p.GuestName,
                p.GuestEmail,
                StageName = p.TicketStage != null ? p.TicketStage.StageName : "Unknown",
                p.IsPresaleVoucher,
                p.HasUpgradedToFullTicket,
                p.PurchaseAmount,
                Status = p.Status.ToString(),
                Faction = p.User != null ? p.User.Faction.ToString() : "None",
                p.CheckedInAt,
                p.CheckedInByOfficer,
                p.CreatedAt
            })
            .ToListAsync();

        return Ok(passes);
    }

    // 2. Save / Update Event Parameters
    public record UpsertEventDto(
        int Id,
        string Title,
        string? Slug,
        string? Tagline,
        string Description,
        string LocationName,
        string VenueAddress,
        DateTime EventDateUtc,
        string? CoverImageUrl,
        string? MediaHypeReelsJson,
        bool IsActive,
        int? DisplayOrder
    );

    [HttpPost]
    public async Task<IActionResult> SaveEvent([FromBody] UpsertEventDto dto)
    {
        if (!await IsAdminOrModAsync()) return Forbid();

        var utcDate = DateTime.SpecifyKind(dto.EventDateUtc, DateTimeKind.Utc);
        var slug = !string.IsNullOrWhiteSpace(dto.Slug) 
            ? dto.Slug.Trim().ToLower().Replace(" ", "-") 
            : dto.Title.Trim().ToLower().Replace(" ", "-");

        if (dto.Id > 0)
        {
            var existing = await _context.GuildEvents.FindAsync(dto.Id);
            if (existing == null) return NotFound("Event not found.");

            existing.Title = dto.Title.Trim();
            existing.Slug = slug;
            existing.Tagline = dto.Tagline ?? string.Empty;
            existing.Description = dto.Description;
            existing.LocationName = dto.LocationName;
            existing.VenueAddress = dto.VenueAddress;
            existing.EventDateUtc = utcDate;
            existing.CoverImageUrl = dto.CoverImageUrl ?? "/assets/fest.jpeg";
            existing.MediaHypeReelsJson = dto.MediaHypeReelsJson;
            existing.IsActive = dto.IsActive;
            existing.DisplayOrder = dto.DisplayOrder ?? 0;
        }
        else
        {
            var evt = new GuildEvent
            {
                Title = dto.Title.Trim(),
                Slug = slug,
                Tagline = dto.Tagline ?? string.Empty,
                Description = dto.Description,
                LocationName = dto.LocationName,
                VenueAddress = dto.VenueAddress,
                EventDateUtc = utcDate,
                CoverImageUrl = dto.CoverImageUrl ?? "/assets/fest.jpeg",
                MediaHypeReelsJson = dto.MediaHypeReelsJson,
                IsActive = dto.IsActive,
                DisplayOrder = dto.DisplayOrder ?? 0
            };
            _context.GuildEvents.Add(evt);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Event saved." });
    }

    // 3. Delete Event from Database
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEvent(int id)
    {
        if (!await IsAdminOrModAsync()) return Forbid();

        var evt = await _context.GuildEvents
            .Include(e => e.TicketStages)
            .Include(e => e.IssuedTickets)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (evt == null) return NotFound("Event not found.");

        _context.GuildEvents.Remove(evt);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Event deleted permanently." });
    }

    // 4. Save or Update Ticket Stage
    public record UpsertStageDto(
        int? Id,
        int EventId,
        string StageName,
        string StageType,
        decimal BasePrice,
        decimal? PresaleDiscountValue,
        int TotalCapacity,
        DateTime SalesStartTimeUtc,
        DateTime SalesEndTimeUtc,
        bool? HidePriceUntilActive,
        bool? IsActive
    );

    [HttpPost("stages")]
    public async Task<IActionResult> SaveStage([FromBody] UpsertStageDto dto)
    {
        if (!await IsAdminOrModAsync()) return Forbid();

        var evt = await _context.GuildEvents.FindAsync(dto.EventId);
        if (evt == null) return BadRequest("Associated event does not exist.");

        var startTime = DateTime.SpecifyKind(dto.SalesStartTimeUtc, DateTimeKind.Utc);
        var endTime = DateTime.SpecifyKind(dto.SalesEndTimeUtc, DateTimeKind.Utc);

        var stageType = Enum.TryParse<TicketStageType>(dto.StageType, true, out var parsedType) 
            ? parsedType 
            : TicketStageType.Standard;

        if (dto.Id.HasValue && dto.Id.Value > 0)
        {
            var existing = await _context.EventTicketStages.FindAsync(dto.Id.Value);
            if (existing == null) return NotFound("Stage not found.");

            existing.StageName = dto.StageName.Trim();
            existing.StageType = stageType;
            existing.BasePrice = dto.BasePrice;
            existing.PresaleDiscountValue = dto.PresaleDiscountValue ?? 0.00m;
            existing.TotalCapacity = dto.TotalCapacity;
            existing.SalesStartTimeUtc = startTime;
            existing.SalesEndTimeUtc = endTime;
            existing.HidePriceUntilActive = dto.HidePriceUntilActive ?? false;
            existing.IsActive = dto.IsActive ?? true;
        }
        else
        {
            var stage = new EventTicketStage
            {
                EventId = dto.EventId,
                StageName = dto.StageName.Trim(),
                StageType = stageType,
                BasePrice = dto.BasePrice,
                PresaleDiscountValue = dto.PresaleDiscountValue ?? 0.00m,
                TotalCapacity = dto.TotalCapacity,
                SalesStartTimeUtc = startTime,
                SalesEndTimeUtc = endTime,
                HidePriceUntilActive = dto.HidePriceUntilActive ?? false,
                IsActive = dto.IsActive ?? true
            };
            _context.EventTicketStages.Add(stage);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Stage configuration saved." });
    }

    // 5. Delete Ticket Stage
    [HttpDelete("stages/{id}")]
    public async Task<IActionResult> DeleteStage(int id)
    {
        if (!await IsAdminOrModAsync()) return Forbid();

        var stage = await _context.EventTicketStages.FindAsync(id);
        if (stage == null) return NotFound();

        _context.EventTicketStages.Remove(stage);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Tier decommissioned." });
    }
}