using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.DTOs;
using OtakusDomainAPI.Enums;
using OtakusDomainAPI.Models;

namespace OtakusDomainAPI.Controllers;

public class TriviaSubmissionDto 
{ 
    public string Answer { get; set; } = string.Empty;
    public int? TrialId { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class LandingController : ControllerBase
{
    private readonly AppDbContext _context;

    public LandingController(AppDbContext context)
    {
        _context = context;
    }

    private static string Normalize(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        return input.Trim()
            .ToLowerInvariant()
            .Replace(".", "")
            .Replace("!", "")
            .Replace("?", "")
            .Replace("'", "")
            .Replace("\"", "")
            .Replace("-", " ")
            .Trim();
    }

    [HttpGet("slides")]
    public async Task<ActionResult<IEnumerable<LandingSlide>>> GetSlides()
    {
        var slides = await _context.LandingSlides.OrderBy(s => s.DisplayOrder).ToListAsync();
        
        if (!slides.Any())
        {
            return Ok(new[]
            {
                new {
                    id = 1, panel = "01", tag = "Next IRL Drop", stamp = "EP. 01 — LIVE EVENT", sfx = "GATHER!!",
                    title1 = "Anime", title2 = "Fest", kanji = "オタクコネクト",
                    desc = "500+ fans. One watch party, one cosplay showdown, two guilds fighting for the leaderboard.",
                    btnText = "Grab Your Tickets", targetUrl = "/events", imageUrl = "/assets/fest.jpeg", displayOrder = 1,
                    memberName = (string?)null, memberAvatar = (string?)null, memberQuote = (string?)null
                },
                new {
                    id = 2, panel = "02", tag = "Seasonal Radar", stamp = "TRANSMISSION // LIVE", sfx = "DROP!",
                    title1 = "Today's", title2 = "Drops", kanji = "最新のリリース",
                    desc = "Demon Slayer Hashira Training Arc Ep 4 is out. Plus, the latest One Piece chapter breakdown is live.",
                    btnText = "Enter The Vault", targetUrl = "/vault", imageUrl = "/assets/drop.jpg", displayOrder = 2,
                    memberName = (string?)null, memberAvatar = (string?)null, memberQuote = (string?)null
                },
                new {
                    id = 3, panel = "03", tag = "Guild Wars", stamp = "GLOBAL STANDINGS", sfx = "CLASH!!",
                    title1 = "Live", title2 = "Rankings", kanji = "ギルドウォーズ",
                    desc = "Check live faction scores and upload your cosplay to close the gap!",
                    btnText = "View Store & Gear", targetUrl = "/store", imageUrl = "/assets/rankings.png", displayOrder = 3,
                    memberName = (string?)null, memberAvatar = (string?)null, memberQuote = (string?)null
                }
            });
        }

        return Ok(slides);
    }

    [HttpGet("daily-trial")]
    public async Task<ActionResult<DailyTrial>> GetActiveTrial()
    {
        var allTrials = await _context.DailyTrials.ToListAsync();

        if (!allTrials.Any())
        {
            var fallback = new DailyTrial
            {
                Question = "What is the alias of Light Yagami when acting as a god of justice?",
                CorrectAnswer = "Kira",
                RewardPoints = 50,
                ActiveDate = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc)
            };
            _context.DailyTrials.Add(fallback);
            await _context.SaveChangesAsync();
            return Ok(fallback);
        }

        var nowUtc = DateTime.UtcNow;
        var todayUtcStr = nowUtc.ToString("yyyy-MM-dd");
        var todayWatStr = nowUtc.AddHours(1).ToString("yyyy-MM-dd");

        var validDateKeys = new HashSet<string> { todayUtcStr, todayWatStr };

        // 1. Direct match for today's calendar date
        var trial = allTrials.FirstOrDefault(t => 
            validDateKeys.Contains(t.ActiveDate.ToString("yyyy-MM-dd")) ||
            validDateKeys.Contains(t.ActiveDate.ToUniversalTime().ToString("yyyy-MM-dd"))
        );

        // 2. Fallback to latest scheduled trial on or before today
        if (trial == null)
        {
            trial = allTrials
                .Where(t => string.Compare(t.ActiveDate.ToString("yyyy-MM-dd"), todayWatStr) <= 0)
                .OrderByDescending(t => t.ActiveDate.ToString("yyyy-MM-dd"))
                .FirstOrDefault()
                ?? allTrials.OrderByDescending(t => t.ActiveDate).First();
        }

        return Ok(trial);
    }

    [HttpPost("submit-trial")]
    [Authorize]
    public async Task<IActionResult> SubmitTrial([FromBody] TriviaSubmissionDto dto)
    {
        try
        {
            var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (string.IsNullOrWhiteSpace(subClaim) || !Guid.TryParse(subClaim, out var userId))
            {
                return Unauthorized(new { success = false, message = "Invalid authorization token." });
            }

            var user = await _context.UserProfiles.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { success = false, message = "Operative dossier not found." });
            }

            DailyTrial? trial = null;

            // 1. Direct match by TrialId sent from the frontend
            if (dto.TrialId.HasValue && dto.TrialId.Value > 0)
            {
                trial = await _context.DailyTrials.FindAsync(dto.TrialId.Value);
            }

            // 2. Fallback to date resolution
            if (trial == null)
            {
                var nowUtc = DateTime.UtcNow;
                var todayUtcStr = nowUtc.ToString("yyyy-MM-dd");
                var todayWatStr = nowUtc.AddHours(1).ToString("yyyy-MM-dd");
                var validDateKeys = new HashSet<string> { todayUtcStr, todayWatStr };

                var allTrials = await _context.DailyTrials.ToListAsync();
                trial = allTrials.FirstOrDefault(t => 
                    validDateKeys.Contains(t.ActiveDate.ToString("yyyy-MM-dd")) ||
                    validDateKeys.Contains(t.ActiveDate.ToUniversalTime().ToString("yyyy-MM-dd"))
                ) ?? allTrials
                    .Where(t => string.Compare(t.ActiveDate.ToString("yyyy-MM-dd"), todayWatStr) <= 0)
                    .OrderByDescending(t => t.ActiveDate.ToString("yyyy-MM-dd"))
                    .FirstOrDefault();
            }

            if (trial == null)
            {
                return NotFound(new { success = false, message = "No active daily trial found to verify." });
            }

            if (string.IsNullOrWhiteSpace(dto.Answer))
            {
                return BadRequest(new { success = false, message = "Answer cannot be blank." });
            }

            // Strict exact match comparison
            var expected = Normalize(trial.CorrectAnswer);
            var submitted = Normalize(dto.Answer);

            bool isCorrect = !string.IsNullOrEmpty(submitted) && expected == submitted;

            if (!isCorrect)
            {
                return BadRequest(new { success = false, message = "Incorrect answer. Try again, operative!" });
            }

            int finalReward = trial.RewardPoints;

            // Underdog multiplier
            var blueCount = await _context.UserProfiles.CountAsync(u => u.Faction == GuildFaction.Blue);
            var redCount = await _context.UserProfiles.CountAsync(u => u.Faction == GuildFaction.Red);

            if (blueCount < redCount && user.Faction == GuildFaction.Blue)
            {
                finalReward = (int)(finalReward * 1.20);
            }
            else if (redCount < blueCount && user.Faction == GuildFaction.Red)
            {
                finalReward = (int)(finalReward * 1.20);
            }

            user.QuestPoints += finalReward;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                rewardPoints = finalReward,
                message = $"Correct! +{finalReward} QP added to your ledger."
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                success = false,
                message = "Telemetry submission error.",
                detail = ex.InnerException?.Message ?? ex.Message
            });
        }
    }

    [HttpPost("recruit")]
    public async Task<IActionResult> SubmitRecruitment([FromBody] RecruitmentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Handle))
            return BadRequest(new { success = false, message = "Handle cannot be empty." });

        var cleanHandle = dto.Handle.Trim();
        
        bool exists = await _context.RecruitmentSubmissions.AnyAsync(r => r.Handle.ToLower() == cleanHandle.ToLower());
        if (exists)
        {
            return Ok(new { success = true, message = "Handle already logged for video casting!" });
        }

        var submission = new RecruitmentSubmission
        {
            Handle = cleanHandle
        };

        _context.RecruitmentSubmissions.Add(submission);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Transmission received! You're in the casting queue." });
    }

    [HttpGet("sponsors")]
    public async Task<ActionResult<IEnumerable<Sponsor>>> GetSponsors()
    {
        var sponsors = await _context.Sponsors.OrderBy(s => s.DisplayOrder).ToListAsync();
        return Ok(sponsors);
    }

    [HttpPost("sponsors")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<Sponsor>> CreateSponsor([FromBody] Sponsor sponsor)
    {
        if (string.IsNullOrWhiteSpace(sponsor.Name) || string.IsNullOrWhiteSpace(sponsor.WebsiteUrl))
            return BadRequest(new { success = false, message = "Name and Website URL are required." });

        _context.Sponsors.Add(sponsor);
        await _context.SaveChangesAsync();
        return Ok(sponsor);
    }

    [HttpDelete("sponsors/{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteSponsor(int id)
    {
        var sponsor = await _context.Sponsors.FindAsync(id);
        if (sponsor == null) return NotFound();

        _context.Sponsors.Remove(sponsor);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Sponsor removed." });
    }
}