using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtakusDomainAPI.Data; 
using System.Security.Claims;

namespace OtakusDomain.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class QuestsController : ControllerBase
    {
        private readonly AppDbContext _context; // Replace with your actual DbContext class name

        public QuestsController(AppDbContext context)
        {
            _context = context;
        }

        public record AwardQpRequest(string ActivityType, string MediaId, string? ChapterId);

        [HttpPost("claim-activity")]
        public async Task<IActionResult> ClaimActivity([FromBody] AwardQpRequest request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (!Guid.TryParse(userIdString, out var userId))
                return Unauthorized("Invalid token subject.");

            var user = await _context.UserProfiles.FindAsync(userId);
            if (user == null) return NotFound("User profile not found.");

            // Determine reward points
            int qpReward = request.ActivityType == "ANIME_INTERACT" ? 5 : 10;

            // Optional daily limit enforcement can be wired here using a log table if desired, 
            // otherwise it directly mutates the user profile ledger just like your trivia trial:

            user.QuestPoints += qpReward;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                qpAwarded = qpReward,
                totalQp = user.QuestPoints,
                message = $"Success! +{qpReward} QP added to your ledger."
            });
        }
    }
}