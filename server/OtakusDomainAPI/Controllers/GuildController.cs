using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.Enums;
using OtakusDomainAPI.DTOs;

namespace OtakusDomainAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GuildController : ControllerBase
{
    private readonly AppDbContext _context;

    public GuildController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetGuildStats()
    {
        var blueMembers = await _context.UserProfiles.CountAsync(u => u.Faction == GuildFaction.Blue);
        var redMembers = await _context.UserProfiles.CountAsync(u => u.Faction == GuildFaction.Red);
        
        var blueScore = await _context.UserProfiles.Where(u => u.Faction == GuildFaction.Blue).SumAsync(u => (long)u.QuestPoints);
        var redScore = await _context.UserProfiles.Where(u => u.Faction == GuildFaction.Red).SumAsync(u => (long)u.QuestPoints);

        // Fetch top operatives reliably without SQL ternary translation failure
        var rawBlueOperatives = await _context.UserProfiles
            .Where(u => u.Faction == GuildFaction.Blue)
            .OrderByDescending(u => u.QuestPoints)
            .Take(3)
            .Select(u => new { u.DisplayName, u.Username, u.QuestPoints })
            .ToListAsync();

        var topBlueOperatives = rawBlueOperatives.Select(u => new {
            displayName = !string.IsNullOrWhiteSpace(u.DisplayName) ? u.DisplayName : (!string.IsNullOrWhiteSpace(u.Username) ? u.Username : "Operative"),
            questPoints = u.QuestPoints
        }).ToList();

        var rawRedOperatives = await _context.UserProfiles
            .Where(u => u.Faction == GuildFaction.Red)
            .OrderByDescending(u => u.QuestPoints)
            .Take(3)
            .Select(u => new { u.DisplayName, u.Username, u.QuestPoints })
            .ToListAsync();

        var topRedOperatives = rawRedOperatives.Select(u => new {
            displayName = !string.IsNullOrWhiteSpace(u.DisplayName) ? u.DisplayName : (!string.IsNullOrWhiteSpace(u.Username) ? u.Username : "Operative"),
            questPoints = u.QuestPoints
        }).ToList();

        string leadingGuild = blueScore > redScore ? "Azure Syndicate" 
                            : redScore > blueScore ? "Crimson Vanguard" 
                            : "Dead Heat";

        return Ok(new
        {
            blueMembers,
            redMembers,
            blueScore,
            redScore,
            leadingGuild,
            isBlueLocked = blueMembers >= redMembers + 10,
            isRedLocked = redMembers >= blueMembers + 10,
            topBlueOperatives,
            topRedOperatives
        });
    }

    [HttpPost("pledge")]
    [Authorize]
    public async Task<IActionResult> PledgeFaction([FromBody] PledgeDto dto)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized("Invalid token subject.");

        var user = await _context.UserProfiles.FindAsync(userId);
        if (user == null) return NotFound("User not found.");

        if (!Enum.TryParse<GuildFaction>(dto.Faction, true, out var chosenFaction))
            return BadRequest(new { success = false, message = "Invalid guild selection." });

        // Handle Abandoning Guild (Choosing None)
        if (chosenFaction == GuildFaction.None)
        {
            user.Faction = GuildFaction.None;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Allegiance abandoned. You are now unaligned." });
        }

        // Handle Defection (Switching between Blue and Red)
        if (user.Faction != GuildFaction.None && user.Faction != chosenFaction)
        {
            const int defectionPenalty = 200;
            if (user.QuestPoints < defectionPenalty)
            {
                return BadRequest(new { success = false, message = $"Insufficient Quest Points! Defection requires {defectionPenalty} QP as a betrayal tax." });
            }

            user.QuestPoints -= defectionPenalty;
        }

        // Enforce the 10-member overflow rule
        var blueCount = await _context.UserProfiles.CountAsync(u => u.Faction == GuildFaction.Blue);
        var redCount = await _context.UserProfiles.CountAsync(u => u.Faction == GuildFaction.Red);

        if (chosenFaction == GuildFaction.Blue && blueCount >= redCount + 10)
            return BadRequest(new { success = false, message = "Azure Syndicate is overpopulated! You must join the Crimson Vanguard to balance the realm." });

        if (chosenFaction == GuildFaction.Red && redCount >= blueCount + 10)
            return BadRequest(new { success = false, message = "Crimson Vanguard is overpopulated! You must join the Azure Syndicate to balance the realm." });

        user.Faction = chosenFaction;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Successfully pledged loyalty to the {chosenFaction} Guild!" });
    }
    [HttpGet("leaderboard")]
public async Task<IActionResult> GetGlobalLeaderboard()
{
    var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
    Guid.TryParse(userIdString, out var currentUserId);

    var rawUsers = await _context.UserProfiles
        .OrderByDescending(u => u.QuestPoints)
        .Select(u => new {
            u.Id,
            u.DisplayName,
            u.Username,
            u.QuestPoints,
            Faction = u.Faction.ToString()
        })
        .ToListAsync();

    var rankedList = rawUsers.Select((u, index) => new {
        rank = index + 1,
        id = u.Id,
        displayName = !string.IsNullOrWhiteSpace(u.DisplayName) ? u.DisplayName : (!string.IsNullOrWhiteSpace(u.Username) ? u.Username : "Operative"),
        questPoints = u.QuestPoints,
        faction = u.Faction,
        isCurrentPlayer = u.Id == currentUserId
    }).ToList();

    var myRankData = rankedList.FirstOrDefault(u => u.isCurrentPlayer);

    return Ok(new {
        leaderboard = rankedList,
        myRank = myRankData
    });
}
}