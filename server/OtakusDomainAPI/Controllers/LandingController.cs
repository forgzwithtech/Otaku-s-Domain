using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.DTOs;
using OtakusDomainAPI.Enums;
using OtakusDomainAPI.Models;

namespace OtakusDomainAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LandingController : ControllerBase
{
    private readonly AppDbContext _context;

    public LandingController(AppDbContext context)
    {
        _context = context;
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
        var startOfDay = DateTime.UtcNow.Date;
        var endOfDay = startOfDay.AddDays(1);

        var trial = await _context.DailyTrials
            .FirstOrDefaultAsync(t => t.ActiveDate >= startOfDay && t.ActiveDate < endOfDay);

        if (trial == null)
        {
            trial = new DailyTrial
            {
                Question = "Who forged Ichigo Kurosaki's true dual Zangetsu blades?",
                CorrectAnswer = "Oetsu Nimaiya",
                RewardPoints = 50,
                ActiveDate = startOfDay
            };

            try
            {
                _context.DailyTrials.Add(trial);
                await _context.SaveChangesAsync();
            }
            catch
            {
                // Concurrency catch in case multiple simultaneous requests attempt to seed
                trial = await _context.DailyTrials
                    .FirstOrDefaultAsync(t => t.ActiveDate >= startOfDay && t.ActiveDate < endOfDay)
                    ?? trial;
            }
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
            if (!Guid.TryParse(subClaim, out var userId))
                return Unauthorized(new { success = false, message = "Invalid token authorization claim." });

            var user = await _context.UserProfiles.FindAsync(userId);
            if (user == null)
                return NotFound(new { success = false, message = "User operative dossier not found." });

            var startOfDay = DateTime.UtcNow.Date;
            var endOfDay = startOfDay.AddDays(1);

            // Safe range query compatible with PostgreSQL timestamps
            var trial = await _context.DailyTrials
                .FirstOrDefaultAsync(t => t.ActiveDate >= startOfDay && t.ActiveDate < endOfDay);

            if (trial == null)
            {
                trial = new DailyTrial
                {
                    Question = "Who forged Ichigo Kurosaki's true dual Zangetsu blades?",
                    CorrectAnswer = "Oetsu Nimaiya",
                    RewardPoints = 50,
                    ActiveDate = startOfDay
                };
                _context.DailyTrials.Add(trial);
                await _context.SaveChangesAsync();
            }

            if (string.IsNullOrWhiteSpace(dto.Answer))
            {
                return BadRequest(new { success = false, message = "Answer cannot be empty." });
            }

            var cleanExpected = (trial.CorrectAnswer ?? string.Empty).Trim().ToLowerInvariant();
            var cleanActual = dto.Answer.Trim().ToLowerInvariant();

            bool isCorrect = cleanExpected == cleanActual || 
                             cleanActual.Contains(cleanExpected) || 
                             cleanExpected.Contains(cleanActual);

            if (!isCorrect)
            {
                return BadRequest(new { success = false, message = "Incorrect answer. Try again, operative!" });
            }

            int finalReward = trial.RewardPoints;

            // Safe underdog bonus calculation
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
            // Surfaces precise error detail in the JSON body for diagnostics
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