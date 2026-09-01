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
[Authorize]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Verifies that the caller has Level 2 Admin status.
    /// </summary>
    private async Task<(bool IsAdmin, IActionResult? ErrorResult)> EnsureAdminAsync()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId))
            return (false, Unauthorized("Invalid token subject."));

        var user = await _context.UserProfiles.FindAsync(userId);
        if (user == null || user.Role != UserRole.Admin)
            return (false, StatusCode(StatusCodes.Status403Forbidden, new { message = "Restricted access: Level 2 Admin clearance required." }));

        return (true, null);
    }

    /// <summary>
    /// Verifies that the caller has either Admin or Moderator status.
    /// </summary>
    private async Task<(bool IsStaff, IActionResult? ErrorResult)> EnsureStaffAsync()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId))
            return (false, Unauthorized("Invalid token subject."));

        var user = await _context.UserProfiles.FindAsync(userId);
        if (user == null || (user.Role != UserRole.Admin && user.Role != UserRole.Moderator))
            return (false, StatusCode(StatusCodes.Status403Forbidden, new { message = "Restricted access: Field Officer / Moderator clearance required." }));

        return (true, null);
    }

    // =========================================================================
    // 1. SYSTEM TELEMETRY & METRICS (ADMIN ONLY)
    // =========================================================================
    [HttpGet("telemetry")]
    public async Task<IActionResult> GetSystemTelemetry()
    {
        var (isAdmin, error) = await EnsureAdminAsync();
        if (!isAdmin) return error!;

        var totalUsers = await _context.UserProfiles.CountAsync();
        var blueCount = await _context.UserProfiles.CountAsync(u => u.Faction == GuildFaction.Blue);
        var redCount = await _context.UserProfiles.CountAsync(u => u.Faction == GuildFaction.Red);
        var unalignedCount = await _context.UserProfiles.CountAsync(u => u.Faction == GuildFaction.None);
        var adultCleared = await _context.UserProfiles.CountAsync(u => u.IsAgeVerified18Plus);
        var pendingRecruits = await _context.RecruitmentSubmissions.CountAsync();
        var totalQpInCirculation = await _context.UserProfiles.SumAsync(u => (long)u.QuestPoints);
        var activeSponsorsCount = await _context.Sponsors.CountAsync();
        var totalScheduledTrials = await _context.DailyTrials.CountAsync();

        return Ok(new
        {
            totalUsers,
            guilds = new { blueCount, redCount, unalignedCount },
            adultCleared,
            pendingRecruits,
            totalQpInCirculation,
            activeSponsorsCount,
            totalScheduledTrials
        });
    }

    // =========================================================================
    // 2. AUTOMATED BIRTHDAY HERO SPOTLIGHT (PUBLIC)
    // =========================================================================
    [HttpGet("birthday-spotlight")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBirthdayChampion()
    {
        var today = DateTime.UtcNow;

        var birthdayCandidates = await _context.UserProfiles
            .Where(u => u.DateOfBirth.HasValue && 
                        u.DateOfBirth.Value.Month == today.Month && 
                        u.DateOfBirth.Value.Day == today.Day)
            .OrderByDescending(u => u.QuestPoints)
            .Select(u => new
            {
                u.Id,
                u.DisplayName,
                u.Username,
                u.AvatarUrl,
                u.Faction,
                u.QuestPoints,
                Age = today.Year - u.DateOfBirth!.Value.Year
            })
            .FirstOrDefaultAsync();

        if (birthdayCandidates == null)
            return Ok(new { hasBirthday = false, champion = (object?)null });

        var displayName = !string.IsNullOrWhiteSpace(birthdayCandidates.DisplayName) 
            ? birthdayCandidates.DisplayName 
            : birthdayCandidates.Username;

        return Ok(new
        {
            hasBirthday = true,
            champion = new
            {
                birthdayCandidates.Id,
                name = displayName,
                birthdayCandidates.AvatarUrl,
                faction = birthdayCandidates.Faction.ToString(),
                birthdayCandidates.QuestPoints,
                birthdayCandidates.Age,
                customSlide = new
                {
                    panel = "BDAY",
                    tag = "BIRTHDAY SPOTLIGHT",
                    stamp = "LEVEL UP CELEBRATION",
                    sfx = "KANPAI!!",
                    title1 = "Happy Birthday",
                    title2 = displayName,
                    kanji = "お誕生日おめでとう",
                    desc = $"Saluting today's top-ranked birthday operative: {displayName} ({birthdayCandidates.QuestPoints} QP) of {birthdayCandidates.Faction} Guild!",
                    btnText = "Send Birthday Gift",
                    imageUrl = birthdayCandidates.AvatarUrl ?? "/assets/fest.jpeg",
                    displayOrder = 0
                }
            }
        });
    }

    // =========================================================================
    // 3. OPERATIVE & USER DOSSIER GOVERNANCE (ADMIN ONLY)
    // =========================================================================
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search, 
        [FromQuery] string? faction, 
        [FromQuery] string? role,
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 20)
    {
        var (isAdmin, error) = await EnsureAdminAsync();
        if (!isAdmin) return error!;

        var query = _context.UserProfiles.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var clean = search.Trim().ToLower();
            query = query.Where(u => u.Username.ToLower().Contains(clean) || 
                                     u.Email.ToLower().Contains(clean) || 
                                     (u.DisplayName != null && u.DisplayName.ToLower().Contains(clean)));
        }

        if (!string.IsNullOrWhiteSpace(faction) && Enum.TryParse<GuildFaction>(faction, true, out var f))
            query = query.Where(u => u.Faction == f);

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var r))
            query = query.Where(u => u.Role == r);

        var total = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.QuestPoints)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.Username,
                u.DisplayName,
                u.AvatarUrl,
                Faction = u.Faction.ToString(),
                Role = u.Role.ToString(),
                u.QuestPoints,
                u.EventCredits,
                u.IsAgeVerified18Plus,
                u.DateOfBirth,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, users });
    }

    public record UpdateUserDossierDto(string? Role, string? Faction, int? QuestPointsDelta, decimal? EventCreditsDelta);

    [HttpPatch("users/{id}")]
    public async Task<IActionResult> UpdateUserDossier(Guid id, [FromBody] UpdateUserDossierDto dto)
    {
        var (isAdmin, error) = await EnsureAdminAsync();
        if (!isAdmin) return error!;

        var user = await _context.UserProfiles.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        if (!string.IsNullOrWhiteSpace(dto.Role) && Enum.TryParse<UserRole>(dto.Role, true, out var newRole))
            user.Role = newRole;

        if (!string.IsNullOrWhiteSpace(dto.Faction) && Enum.TryParse<GuildFaction>(dto.Faction, true, out var newFaction))
            user.Faction = newFaction;

        if (dto.QuestPointsDelta.HasValue)
            user.QuestPoints = Math.Max(0, user.QuestPoints + dto.QuestPointsDelta.Value);

        if (dto.EventCreditsDelta.HasValue)
            user.EventCredits = Math.Max(0, user.EventCredits + dto.EventCreditsDelta.Value);

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Operative ledger updated.", user });
    }

    // =========================================================================
    // 4. LANDING SLIDES CAROUSEL MANAGEMENT (ADMIN ONLY)
    // =========================================================================
    [HttpGet("slides")]
    public async Task<IActionResult> GetAllSlides()
    {
        var (isAdmin, error) = await EnsureAdminAsync();
        if (!isAdmin) return error!;

        var slides = await _context.LandingSlides.OrderBy(s => s.DisplayOrder).ToListAsync();
        return Ok(slides);
    }

    [HttpPost("slides")]
    public async Task<IActionResult> CreateSlide([FromBody] LandingSlide slide)
    {
        var (isAdmin, error) = await EnsureAdminAsync();
        if (!isAdmin) return error!;

        _context.LandingSlides.Add(slide);
        await _context.SaveChangesAsync();
        return Ok(slide);
    }

 [HttpPut("slides/{id}")]
    public async Task<IActionResult> UpdateSlide(int id, [FromBody] LandingSlide updated)
    {
        var (isAdmin, error) = await EnsureAdminAsync();
        if (!isAdmin) return error!;

        var slide = await _context.LandingSlides.FindAsync(id);
        if (slide == null) return NotFound();

        slide.Panel = updated.Panel;
        slide.Tag = updated.Tag;
        slide.Stamp = updated.Stamp;
        slide.Sfx = updated.Sfx;
        slide.Title1 = updated.Title1;
        slide.Title2 = updated.Title2;
        slide.Kanji = updated.Kanji;
        slide.Desc = updated.Desc;
        slide.BtnText = updated.BtnText;
        slide.TargetUrl = string.IsNullOrWhiteSpace(updated.TargetUrl) ? "/vault" : updated.TargetUrl;
        slide.ImageUrl = updated.ImageUrl;
        slide.MemberName = updated.MemberName;
        slide.MemberAvatar = updated.MemberAvatar;
        slide.MemberQuote = updated.MemberQuote;
        slide.DisplayOrder = updated.DisplayOrder;

        await _context.SaveChangesAsync();
        return Ok(slide);
    }
    
    [HttpDelete("slides/{id}")]
    public async Task<IActionResult> DeleteSlide(int id)
    {
        var (isAdmin, error) = await EnsureAdminAsync();
        if (!isAdmin) return error!;

        var slide = await _context.LandingSlides.FindAsync(id);
        if (slide == null) return NotFound();

        _context.LandingSlides.Remove(slide);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Slide decommissioned." });
    }

    // =========================================================================
    // 5. DAILY TRIALS TRIVIA PIPELINE (ACCESSIBLE TO ADMIN & MODERATOR)
    // =========================================================================
    [HttpGet("daily-trials")]
    public async Task<IActionResult> GetDailyTrials([FromQuery] int page = 1, [FromQuery] int pageSize = 30)
    {
        var (isStaff, error) = await EnsureStaffAsync();
        if (!isStaff) return error!;

        var total = await _context.DailyTrials.CountAsync();
        var trials = await _context.DailyTrials
            .OrderByDescending(t => t.ActiveDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, trials });
    }

    public record UpsertTrialDto(int? Id, string Question, string CorrectAnswer, int RewardPoints, DateTime ActiveDate);

    [HttpPost("daily-trials")]
    public async Task<IActionResult> SaveDailyTrial([FromBody] UpsertTrialDto dto)
    {
        var (isStaff, error) = await EnsureStaffAsync();
        if (!isStaff) return error!;

        var trialDate = DateTime.SpecifyKind(dto.ActiveDate.Date, DateTimeKind.Utc);

        DailyTrial? trial = null;
        if (dto.Id.HasValue && dto.Id.Value > 0)
        {
            trial = await _context.DailyTrials.FindAsync(dto.Id.Value);
        }

        if (trial == null)
        {
            trial = await _context.DailyTrials.FirstOrDefaultAsync(t => t.ActiveDate.Date == trialDate);
        }

        if (trial != null)
        {
            trial.Question = dto.Question;
            trial.CorrectAnswer = dto.CorrectAnswer;
            trial.RewardPoints = dto.RewardPoints;
            trial.ActiveDate = trialDate;
        }
        else
        {
            trial = new DailyTrial
            {
                Question = dto.Question,
                CorrectAnswer = dto.CorrectAnswer,
                RewardPoints = dto.RewardPoints,
                ActiveDate = trialDate
            };
            _context.DailyTrials.Add(trial);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = $"Trial successfully set for {trialDate:yyyy-MM-dd}.", trial });
    }

    [HttpDelete("daily-trials/{id}")]
    public async Task<IActionResult> DeleteDailyTrial(int id)
    {
        var (isStaff, error) = await EnsureStaffAsync();
        if (!isStaff) return error!;

        var trial = await _context.DailyTrials.FindAsync(id);
        if (trial == null) return NotFound();

        _context.DailyTrials.Remove(trial);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Daily trial removed." });
    }

    // =========================================================================
    // 6. SPONSORS MANAGEMENT (ADMIN ONLY)
    // =========================================================================
    [HttpGet("sponsors")]
    public async Task<IActionResult> GetAllSponsors()
    {
        var (isAdmin, error) = await EnsureAdminAsync();
        if (!isAdmin) return error!;

        var sponsors = await _context.Sponsors.OrderBy(s => s.DisplayOrder).ToListAsync();
        return Ok(sponsors);
    }

    [HttpPost("sponsors")]
    public async Task<IActionResult> CreateSponsor([FromBody] Sponsor sponsor)
    {
        var (isAdmin, error) = await EnsureAdminAsync();
        if (!isAdmin) return error!;

        _context.Sponsors.Add(sponsor);
        await _context.SaveChangesAsync();
        return Ok(sponsor);
    }

    [HttpPut("sponsors/{id}")]
    public async Task<IActionResult> UpdateSponsor(int id, [FromBody] Sponsor updated)
    {
        var (isAdmin, error) = await EnsureAdminAsync();
        if (!isAdmin) return error!;

        var sponsor = await _context.Sponsors.FindAsync(id);
        if (sponsor == null) return NotFound();

        sponsor.Name = updated.Name;
        sponsor.Role = updated.Role;
        sponsor.WebsiteUrl = updated.WebsiteUrl;
        sponsor.DisplayOrder = updated.DisplayOrder;

        await _context.SaveChangesAsync();
        return Ok(sponsor);
    }

    [HttpDelete("sponsors/{id}")]
    public async Task<IActionResult> DeleteSponsor(int id)
    {
        var (isAdmin, error) = await EnsureAdminAsync();
        if (!isAdmin) return error!;

        var sponsor = await _context.Sponsors.FindAsync(id);
        if (sponsor == null) return NotFound();

        _context.Sponsors.Remove(sponsor);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Sponsor removed." });
    }

    // =========================================================================
    // 7. RECRUITMENT CASTING PIPELINE (ACCESSIBLE TO ADMIN & MODERATOR)
    // =========================================================================
    [HttpGet("recruits")]
    public async Task<IActionResult> GetRecruits()
    {
        var (isStaff, error) = await EnsureStaffAsync();
        if (!isStaff) return error!;

        var list = await _context.RecruitmentSubmissions
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
        return Ok(list);
    }

    [HttpDelete("recruits/{id}")]
    public async Task<IActionResult> DeleteRecruit(int id)
    {
        var (isStaff, error) = await EnsureStaffAsync();
        if (!isStaff) return error!;

        var recruit = await _context.RecruitmentSubmissions.FindAsync(id);
        if (recruit == null) return NotFound();

        _context.RecruitmentSubmissions.Remove(recruit);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Casting entry removed." });
    }
}