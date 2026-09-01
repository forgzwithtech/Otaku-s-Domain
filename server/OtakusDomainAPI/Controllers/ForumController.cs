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
public class ForumController : ControllerBase
{
    private readonly AppDbContext _context;

    public ForumController(AppDbContext context)
    {
        _context = context;
    }

    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    // ==========================================
    // 1. GENDER SET & FORUM GATEKEEPER CHECK
    // ==========================================
    public record SetGenderDto(string Gender);

    [HttpPost("set-gender")]
    [Authorize]
    public async Task<IActionResult> SetGender([FromBody] SetGenderDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.UserProfiles.FindAsync(userId.Value);
        if (user == null) return NotFound("User not found.");

        if (string.IsNullOrWhiteSpace(dto.Gender) || dto.Gender.Equals("Unspecified", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { success = false, message = "Please select a valid gender." });
        }

        user.Gender = Enum.TryParse<UserGender>(dto.Gender, true, out var g) ? g : UserGender.Other;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, gender = user.Gender.ToString(), message = "Gender registered! Access granted to Forum." });
    }

    // ==========================================
    // 2. CATEGORIES
    // ==========================================
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.ForumCategories
            .OrderBy(c => c.DisplayOrder)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Slug,
                c.Description,
                c.Icon,
                c.Is18PlusOnly,
                ThreadCount = _context.ForumThreads.Count(t => t.CategoryId == c.Id)
            })
            .ToListAsync();

        return Ok(categories);
    }

    // ==========================================
    // 3. THREADS FEED (WITH MEDIA TYPE & SEARCH)
    // ==========================================
    [HttpGet("threads")]
    public async Task<IActionResult> GetThreads(
        [FromQuery] int? categoryId,
        [FromQuery] string? mediaType, // "ANIME" | "MANGA"
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.ForumThreads
            .Include(t => t.Category)
            .Include(t => t.Author)
            .AsQueryable();

        if (categoryId.HasValue)
            query = query.Where(t => t.CategoryId == categoryId.Value);

        if (!string.IsNullOrWhiteSpace(mediaType))
            query = query.Where(t => t.MediaType != null && t.MediaType.ToUpper() == mediaType.ToUpper());

        if (!string.IsNullOrWhiteSpace(search))
        {
            var clean = search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(clean) || 
                                     t.Content.ToLower().Contains(clean) ||
                                     (t.MediaTitle != null && t.MediaTitle.ToLower().Contains(clean)));
        }

        var total = await query.CountAsync();
        var threads = await query
            .OrderByDescending(t => t.IsPinned)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                t.Id,
                t.Title,
                t.Content,
                t.ImageUrl,
                t.MediaId,
                t.MediaType,
                t.MediaTitle,
                t.MediaCoverUrl,
                t.MediaScore,
                t.IsPinned,
                t.IsLocked,
                t.ViewCount,
                t.CreatedAt,
                ReplyCount = t.Comments.Count,
                Category = new { t.Category!.Id, t.Category.Name, t.Category.Icon, t.Category.Is18PlusOnly },
                Author = new
                {
                    t.Author!.Id,
                    DisplayName = !string.IsNullOrWhiteSpace(t.Author.DisplayName) ? t.Author.DisplayName : t.Author.Username,
                    t.Author.AvatarUrl,
                    Faction = t.Author.Faction.ToString(),
                    Role = t.Author.Role.ToString(),
                    Gender = t.Author.Gender.ToString(),
                    t.Author.QuestPoints
                }
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, threads });
    }

    // ==========================================
    // 4. GET SINGLE THREAD WITH COMMENTS
    // ==========================================
    [HttpGet("threads/{id}")]
    public async Task<IActionResult> GetThreadDetails(int id)
    {
        var thread = await _context.ForumThreads
            .Include(t => t.Category)
            .Include(t => t.Author)
            .Include(t => t.Comments)
                .ThenInclude(c => c.Author)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (thread == null) return NotFound("Thread not found.");

        // Increment view count atomically
        thread.ViewCount++;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            thread.Id,
            thread.Title,
            thread.Content,
            thread.ImageUrl,
            thread.MediaId,
            thread.MediaType,
            thread.MediaTitle,
            thread.MediaCoverUrl,
            thread.MediaScore,
            thread.IsPinned,
            thread.IsLocked,
            thread.ViewCount,
            thread.CreatedAt,
            Category = new { thread.Category!.Id, thread.Category.Name, thread.Category.Icon, thread.Category.Is18PlusOnly },
            Author = new
            {
                thread.Author!.Id,
                DisplayName = !string.IsNullOrWhiteSpace(thread.Author.DisplayName) ? thread.Author.DisplayName : thread.Author.Username,
                thread.Author.AvatarUrl,
                Faction = thread.Author.Faction.ToString(),
                Role = thread.Author.Role.ToString(),
                Gender = thread.Author.Gender.ToString(),
                thread.Author.QuestPoints
            },
            Comments = thread.Comments.OrderBy(c => c.CreatedAt).Select(c => new
            {
                c.Id,
                c.Content,
                c.CreatedAt,
                Author = new
                {
                    c.Author!.Id,
                    DisplayName = !string.IsNullOrWhiteSpace(c.Author.DisplayName) ? c.Author.DisplayName : c.Author.Username,
                    c.Author.AvatarUrl,
                    Faction = c.Author.Faction.ToString(),
                    Role = c.Author.Role.ToString(),
                    Gender = c.Author.Gender.ToString(),
                    c.Author.QuestPoints
                }
            })
        });
    }

    // ==========================================
    // 5. CREATE THREAD (GATEKEEPER & ANILIST LINKAGE)
    // ==========================================
    public record CreateThreadDto(
        int CategoryId, 
        string Title, 
        string Content, 
        string? ImageUrl,
        int? MediaId,
        string? MediaType,
        string? MediaTitle,
        string? MediaCoverUrl,
        int? MediaScore
    );

    [HttpPost("threads")]
    [Authorize]
    public async Task<IActionResult> CreateThread([FromBody] CreateThreadDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.UserProfiles.FindAsync(userId.Value);
        if (user == null) return NotFound();

        // GENDER GATEKEEPER CHECK:
        if (user.Gender == UserGender.Unspecified)
        {
            return BadRequest(new { requiresGender = true, message = "Identity declaration required! Specify your gender to post in the forum." });
        }

        var category = await _context.ForumCategories.FindAsync(dto.CategoryId);
        if (category == null) return BadRequest("Invalid category.");

        if (category.Is18PlusOnly && !user.IsAgeVerified18Plus)
        {
            return BadRequest("Access Denied: Level 18+ clearance required for this lounge.");
        }

        var thread = new ForumThread
        {
            CategoryId = dto.CategoryId,
            AuthorId = user.Id,
            Title = dto.Title.Trim(),
            Content = dto.Content.Trim(),
            ImageUrl = dto.ImageUrl,
            MediaId = dto.MediaId,
            MediaType = dto.MediaType,
            MediaTitle = dto.MediaTitle,
            MediaCoverUrl = dto.MediaCoverUrl,
            MediaScore = dto.MediaScore
        };

        _context.ForumThreads.Add(thread);
        
        // Award +5 QP for active forum engagement
        user.QuestPoints += 5;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, threadId = thread.Id, qpAwarded = 5, message = "Thread broadcasted! +5 QP earned." });
    }

    // ==========================================
    // 6. POST COMMENT (GATEKEEPER APPLIED)
    // ==========================================
    public record CreateCommentDto(string Content);

    [HttpPost("threads/{threadId}/comments")]
    [Authorize]
    public async Task<IActionResult> PostComment(int threadId, [FromBody] CreateCommentDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.UserProfiles.FindAsync(userId.Value);
        if (user == null) return NotFound();

        if (user.Gender == UserGender.Unspecified)
        {
            return BadRequest(new { requiresGender = true, message = "Identity declaration required! Specify your gender to participate." });
        }

        var thread = await _context.ForumThreads.Include(t => t.Category).FirstOrDefaultAsync(t => t.Id == threadId);
        if (thread == null) return NotFound("Thread not found.");

        if (thread.IsLocked) return BadRequest("This thread is locked by Interpool moderators.");

        if (thread.Category!.Is18PlusOnly && !user.IsAgeVerified18Plus)
        {
            return BadRequest("18+ clearance required.");
        }

        var comment = new ForumComment
        {
            ThreadId = threadId,
            AuthorId = user.Id,
            Content = dto.Content.Trim()
        };

        _context.ForumComments.Add(comment);
        
        // Award +2 QP for replying
        user.QuestPoints += 2;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, commentId = comment.Id, qpAwarded = 2, message = "Transmission sent!" });
    }
}