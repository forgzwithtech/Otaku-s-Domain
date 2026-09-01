using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.DTOs;
using OtakusDomainAPI.Enums;
using OtakusDomainAPI.Models;

namespace OtakusDomainAPI.Controllers;

public record UpdateUsernameDto(string Username, string? DisplayName, string? AvatarUrl);

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuthController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Syncs or creates the user's profile right after Supabase OAuth (Google/Apple)
    /// </summary>
    [HttpPost("sync")]
    public async Task<ActionResult<UserProfileDto>> SyncProfile()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) 
            ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized("Invalid Supabase token subject.");

        var email = User.FindFirstValue(ClaimTypes.Email) 
            ?? User.FindFirstValue("email") 
            ?? string.Empty;

        var user = await _context.UserProfiles.FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            try
            {
                user = new UserProfile
                {
                    Id = userId,
                    Email = email,
                    Username = email.Split('@')[0] + "_" + Guid.NewGuid().ToString("N")[..4],
                    DisplayName = email.Split('@')[0],
                    Faction = GuildFaction.None,
                    Role = UserRole.Member,
                    QuestPoints = 50
                };

                _context.UserProfiles.Add(user);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                user = await _context.UserProfiles.FirstOrDefaultAsync(u => u.Id == userId);
                if (user == null) throw;
            }
        }

        return Ok(MapToDto(user));
    }

    /// <summary>
    /// Gets current authenticated user's profile
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetMyProfile()
    {
        var userId = GetCurrentUserId();
        var user = await _context.UserProfiles.FindAsync(userId);
        if (user == null) return NotFound("User profile not found.");

        return Ok(MapToDto(user));
    }

    /// <summary>
    /// Pledge alignment to a guild (Switches theme from Purple to Blue or Red)
    /// </summary>
    [HttpPost("pledge-guild")]
    public async Task<ActionResult<UserProfileDto>> PledgeGuild([FromBody] SetGuildDto dto)
    {
        var userId = GetCurrentUserId();
        var user = await _context.UserProfiles.FindAsync(userId);
        if (user == null) return NotFound();

        if (!Enum.TryParse<GuildFaction>(dto.Faction, true, out var chosenFaction) || chosenFaction == GuildFaction.None)
        {
            return BadRequest("Invalid faction. Choose either 'Blue' or 'Red'.");
        }

        user.Faction = chosenFaction;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapToDto(user));
    }

    [HttpPost("verify-age")]
    public async Task<ActionResult<UserProfileDto>> VerifyAge([FromBody] VerifyAgeDto dto)
    {
        var userId = GetCurrentUserId();
        var user = await _context.UserProfiles.FindAsync(userId);
        if (user == null) return NotFound("User profile not found.");

        var utcDob = DateTime.SpecifyKind(dto.DateOfBirth.Date, DateTimeKind.Utc);
        var today = DateTime.UtcNow.Date;
        var age = today.Year - utcDob.Year;
        if (utcDob > today.AddYears(-age)) age--;

        user.DateOfBirth = utcDob;
        user.IsAgeVerified18Plus = (age >= 18);
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        if (age < 18)
        {
            return Ok(new { 
                profile = MapToDto(user),
                isAllowed = false,
                message = "Operative identified as under 18. Classified 18+ zones locked." 
            });
        }

        return Ok(new { 
            profile = MapToDto(user),
            isAllowed = true,
            message = "Security clearance approved. Welcome to the classified district." 
        });
    }

    [HttpPatch("update-handle")]
    public async Task<IActionResult> UpdateHandle([FromBody] UpdateUsernameDto dto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized("Invalid token subject.");

        if (string.IsNullOrWhiteSpace(dto.Username))
            return BadRequest(new { success = false, message = "Username cannot be empty." });

        var cleanUsername = dto.Username.Trim().ToLower().Replace(" ", "_");
        if (cleanUsername.Length < 3 || cleanUsername.Length > 24)
            return BadRequest(new { success = false, message = "Username must be between 3 and 24 characters." });

        var existing = await _context.UserProfiles
            .AnyAsync(u => u.Username.ToLower() == cleanUsername && u.Id != userId);

        if (existing)
            return Conflict(new { success = false, message = $"@{cleanUsername} is already claimed by another operative." });

        var user = await _context.UserProfiles.FindAsync(userId);
        if (user == null) return NotFound("Operative dossier not found.");

        user.Username = cleanUsername;
        if (!string.IsNullOrWhiteSpace(dto.DisplayName))
        {
            user.DisplayName = dto.DisplayName.Trim();
        }
        if (!string.IsNullOrWhiteSpace(dto.AvatarUrl))
        {
            user.AvatarUrl = dto.AvatarUrl.Trim();
        }
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Codename and avatar updated successfully.",
            username = user.Username,
            displayName = user.DisplayName,
            avatarUrl = user.AvatarUrl
        });
    }

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.Parse(sub!);
    }

    private static UserProfileDto MapToDto(UserProfile user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        Username = user.Username,
        DisplayName = user.DisplayName,
        AvatarUrl = user.AvatarUrl,
        AvatarConfigJson = user.AvatarConfigJson,
        Faction = user.Faction.ToString(),
        Role = user.Role.ToString(),
        QuestPoints = user.QuestPoints,
        EventCredits = user.EventCredits,
        IsAgeVerified18Plus = user.IsAgeVerified18Plus,
        DateOfBirth = user.DateOfBirth,
        Gender = user.Gender.ToString(),
    };
}