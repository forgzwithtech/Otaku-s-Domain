using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OtakusDomainAPI.Data;
using OtakusDomainAPI.Enums;
using OtakusDomainAPI.Models;
using System.Security.Claims;
using System.Text.RegularExpressions;

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

    private async Task DispatchMentionNotifications(string text, Guid actorId, int threadId, int? commentId = null)
    {
        var matches = Regex.Matches(text, @"@([a-zA-Z0-9_]{3,24})");
        if (matches.Count == 0) return;

        var actor = await _context.UserProfiles.FindAsync(actorId);
        var actorName = actor?.DisplayName ?? actor?.Username ?? "An operative";

        var handles = matches.Select(m => m.Groups[1].Value.ToLower()).Distinct().ToList();
        var targetUsers = await _context.UserProfiles
            .Where(u => handles.Contains(u.Username.ToLower()) && u.Id != actorId)
            .ToListAsync();

        foreach (var target in targetUsers)
        {
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = target.Id,
                ActorId = actorId,
                Type = "MENTION",
                ThreadId = threadId,
                CommentId = commentId,
                Message = $"@{actor?.Username} tagged you in a transmission."
            });
        }
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
    // 3. THREADS FEED (X-STYLE WITH LIKES & REPOSTS)
    // ==========================================
    [HttpGet("threads")]
    public async Task<IActionResult> GetThreads(
        [FromQuery] int? categoryId,
        [FromQuery] string? mediaType,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var currentUserId = GetCurrentUserId();

        var query = _context.ForumThreads
            .Include(t => t.Category)
            .Include(t => t.Author)
            .Include(t => t.RepostOfThread)
                .ThenInclude(r => r!.Author)
            .Include(t => t.Likes)
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
        var rawThreads = await query
            .OrderByDescending(t => t.IsPinned)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var threads = rawThreads.Select(t => new
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
            ReplyCount = _context.ForumComments.Count(c => c.ThreadId == t.Id),
            LikesCount = t.Likes.Count,
            HasLiked = currentUserId.HasValue && t.Likes.Any(l => l.UserId == currentUserId.Value),
            RepostCount = _context.ForumThreads.Count(r => r.RepostOfThreadId == t.Id),
            t.IsQuoteRepost,
            RepostOfThread = t.RepostOfThread == null ? null : new
            {
                t.RepostOfThread.Id,
                t.RepostOfThread.Title,
                t.RepostOfThread.Content,
                t.RepostOfThread.ImageUrl,
                Author = new
                {
                    t.RepostOfThread.Author!.Id,
                    DisplayName = !string.IsNullOrWhiteSpace(t.RepostOfThread.Author.DisplayName) ? t.RepostOfThread.Author.DisplayName : t.RepostOfThread.Author.Username,
                    Username = t.RepostOfThread.Author.Username,
                    t.RepostOfThread.Author.AvatarUrl,
                    Faction = t.RepostOfThread.Author.Faction.ToString()
                }
            },
            Category = new { t.Category!.Id, t.Category.Name, t.Category.Icon, t.Category.Is18PlusOnly },
            Author = new
            {
                t.Author!.Id,
                DisplayName = !string.IsNullOrWhiteSpace(t.Author.DisplayName) ? t.Author.DisplayName : t.Author.Username,
                Username = t.Author.Username,
                t.Author.AvatarUrl,
                Faction = t.Author.Faction.ToString(),
                Role = t.Author.Role.ToString(),
                Gender = t.Author.Gender.ToString(),
                t.Author.QuestPoints
            }
        });

        return Ok(new { total, page, pageSize, threads });
    }

    // ==========================================
    // 4. GET SINGLE THREAD WITH NESTED COMMENTS
    // ==========================================
    [HttpGet("threads/{id}")]
    public async Task<IActionResult> GetThreadDetails(int id)
    {
        var currentUserId = GetCurrentUserId();

        var thread = await _context.ForumThreads
            .Include(t => t.Category)
            .Include(t => t.Author)
            .Include(t => t.Likes)
            .Include(t => t.RepostOfThread)
                .ThenInclude(r => r!.Author)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (thread == null) return NotFound("Thread not found.");

        thread.ViewCount++;
        await _context.SaveChangesAsync();

        var allComments = await _context.ForumComments
            .Include(c => c.Author)
            .Include(c => c.Likes)
            .Where(c => c.ThreadId == id)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        var commentsDto = allComments.Select(c => new
        {
            c.Id,
            c.ParentCommentId,
            c.Content,
            c.CreatedAt,
            LikesCount = c.Likes.Count,
            HasLiked = currentUserId.HasValue && c.Likes.Any(l => l.UserId == currentUserId.Value),
            Author = new
            {
                c.Author!.Id,
                DisplayName = !string.IsNullOrWhiteSpace(c.Author.DisplayName) ? c.Author.DisplayName : c.Author.Username,
                Username = c.Author.Username,
                c.Author.AvatarUrl,
                Faction = c.Author.Faction.ToString(),
                Role = c.Author.Role.ToString(),
                Gender = c.Author.Gender.ToString(),
                c.Author.QuestPoints
            }
        }).ToList();

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
            LikesCount = thread.Likes.Count,
            HasLiked = currentUserId.HasValue && thread.Likes.Any(l => l.UserId == currentUserId.Value),
            RepostCount = await _context.ForumThreads.CountAsync(r => r.RepostOfThreadId == thread.Id),
            thread.IsQuoteRepost,
            RepostOfThread = thread.RepostOfThread == null ? null : new
            {
                thread.RepostOfThread.Id,
                thread.RepostOfThread.Title,
                thread.RepostOfThread.Content,
                thread.RepostOfThread.ImageUrl,
                Author = new
                {
                    thread.RepostOfThread.Author!.Id,
                    DisplayName = !string.IsNullOrWhiteSpace(thread.RepostOfThread.Author.DisplayName) ? thread.RepostOfThread.Author.DisplayName : thread.RepostOfThread.Author.Username,
                    Username = thread.RepostOfThread.Author.Username,
                    thread.RepostOfThread.Author.AvatarUrl,
                    Faction = thread.RepostOfThread.Author.Faction.ToString()
                }
            },
            Category = new { thread.Category!.Id, thread.Category.Name, thread.Category.Icon, thread.Category.Is18PlusOnly },
            Author = new
            {
                thread.Author!.Id,
                DisplayName = !string.IsNullOrWhiteSpace(thread.Author.DisplayName) ? thread.Author.DisplayName : thread.Author.Username,
                Username = thread.Author.Username,
                thread.Author.AvatarUrl,
                Faction = thread.Author.Faction.ToString(),
                Role = thread.Author.Role.ToString(),
                Gender = thread.Author.Gender.ToString(),
                thread.Author.QuestPoints
            },
            Comments = commentsDto
        });
    }

    // ==========================================
    // 5. CREATE THREAD / QUOTE REPOST
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
        int? MediaScore,
        int? RepostOfThreadId,
        bool? IsQuoteRepost
    );

    [HttpPost("threads")]
    [Authorize]
    public async Task<IActionResult> CreateThread([FromBody] CreateThreadDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var user = await _context.UserProfiles.FindAsync(userId.Value);
        if (user == null) return NotFound();

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
            MediaScore = dto.MediaScore,
            RepostOfThreadId = dto.RepostOfThreadId,
            IsQuoteRepost = dto.IsQuoteRepost ?? false
        };

        _context.ForumThreads.Add(thread);
        user.QuestPoints += 5;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Dispatch Quote and Mention Notifications
        if (dto.RepostOfThreadId.HasValue)
        {
            var original = await _context.ForumThreads.FindAsync(dto.RepostOfThreadId.Value);
            if (original != null && original.AuthorId != user.Id)
            {
                _context.UserNotifications.Add(new UserNotification
                {
                    UserId = original.AuthorId,
                    ActorId = user.Id,
                    Type = "QUOTE",
                    ThreadId = thread.Id,
                    Message = $"@{user.Username} quoted your transmission."
                });
            }
        }

        await DispatchMentionNotifications(dto.Content, user.Id, thread.Id);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, threadId = thread.Id, qpAwarded = 5, message = "Thread broadcasted! +5 QP earned." });
    }

    // ==========================================
    // 6. INSTANT REPOST TOGGLE
    // ==========================================
    [HttpPost("threads/{threadId}/repost")]
    [Authorize]
    public async Task<IActionResult> ToggleRepost(int threadId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var original = await _context.ForumThreads.FindAsync(threadId);
        if (original == null) return NotFound("Thread not found.");

        var existing = await _context.ForumThreads
            .FirstOrDefaultAsync(t => t.AuthorId == userId.Value && t.RepostOfThreadId == threadId && !t.IsQuoteRepost);

        if (existing != null)
        {
            _context.ForumThreads.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, reposted = false, message = "Repost retracted." });
        }

        var repost = new ForumThread
        {
            CategoryId = original.CategoryId,
            AuthorId = userId.Value,
            Title = $"Repost: {original.Title}",
            Content = string.Empty,
            RepostOfThreadId = threadId,
            IsQuoteRepost = false
        };

        _context.ForumThreads.Add(repost);

        if (original.AuthorId != userId.Value)
        {
            var actor = await _context.UserProfiles.FindAsync(userId.Value);
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = original.AuthorId,
                ActorId = userId.Value,
                Type = "REPOST",
                ThreadId = threadId,
                Message = $"@{actor?.Username} reposted your transmission."
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, reposted = true, message = "Transmission reposted to your guild frequency!" });
    }

    // ==========================================
    // 7. THREAD LIKE TOGGLE
    // ==========================================
    [HttpPost("threads/{threadId}/like")]
    [Authorize]
    public async Task<IActionResult> ToggleThreadLike(int threadId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var thread = await _context.ForumThreads.FindAsync(threadId);
        if (thread == null) return NotFound();

        var like = await _context.ForumThreadLikes.FirstOrDefaultAsync(l => l.ThreadId == threadId && l.UserId == userId.Value);
        bool liked;

        if (like != null)
        {
            _context.ForumThreadLikes.Remove(like);
            liked = false;
        }
        else
        {
            _context.ForumThreadLikes.Add(new ForumThreadLike { ThreadId = threadId, UserId = userId.Value });
            liked = true;

            if (thread.AuthorId != userId.Value)
            {
                var actor = await _context.UserProfiles.FindAsync(userId.Value);
                _context.UserNotifications.Add(new UserNotification
                {
                    UserId = thread.AuthorId,
                    ActorId = userId.Value,
                    Type = "LIKE",
                    ThreadId = threadId,
                    Message = $"@{actor?.Username} liked your transmission."
                });
            }
        }

        await _context.SaveChangesAsync();
        var count = await _context.ForumThreadLikes.CountAsync(l => l.ThreadId == threadId);
        return Ok(new { success = true, liked, likesCount = count });
    }

    // ==========================================
    // 8. POST COMMENT & REPLY TO COMMENT
    // ==========================================
    public record CreateCommentDto(string Content, int? ParentCommentId);

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

        var comment = new ForumComment
        {
            ThreadId = threadId,
            AuthorId = user.Id,
            ParentCommentId = dto.ParentCommentId,
            Content = dto.Content.Trim()
        };

        _context.ForumComments.Add(comment);
        user.QuestPoints += 2;
        await _context.SaveChangesAsync();

        // Notify parent comment author or thread author
        if (dto.ParentCommentId.HasValue)
        {
            var parent = await _context.ForumComments.FindAsync(dto.ParentCommentId.Value);
            if (parent != null && parent.AuthorId != user.Id)
            {
                _context.UserNotifications.Add(new UserNotification
                {
                    UserId = parent.AuthorId,
                    ActorId = user.Id,
                    Type = "REPLY",
                    ThreadId = threadId,
                    CommentId = comment.Id,
                    Message = $"@{user.Username} replied to your comment."
                });
            }
        }
        else if (thread.AuthorId != user.Id)
        {
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = thread.AuthorId,
                ActorId = user.Id,
                Type = "REPLY",
                ThreadId = threadId,
                CommentId = comment.Id,
                Message = $"@{user.Username} replied to your thread."
            });
        }

        await DispatchMentionNotifications(dto.Content, user.Id, threadId, comment.Id);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, commentId = comment.Id, qpAwarded = 2, message = "Transmission sent!" });
    }

    // ==========================================
    // 9. COMMENT LIKE TOGGLE
    // ==========================================
    [HttpPost("comments/{commentId}/like")]
    [Authorize]
    public async Task<IActionResult> ToggleCommentLike(int commentId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var comment = await _context.ForumComments.FindAsync(commentId);
        if (comment == null) return NotFound();

        var like = await _context.ForumCommentLikes.FirstOrDefaultAsync(l => l.CommentId == commentId && l.UserId == userId.Value);
        bool liked;

        if (like != null)
        {
            _context.ForumCommentLikes.Remove(like);
            liked = false;
        }
        else
        {
            _context.ForumCommentLikes.Add(new ForumCommentLike { CommentId = commentId, UserId = userId.Value });
            liked = true;

            if (comment.AuthorId != userId.Value)
            {
                var actor = await _context.UserProfiles.FindAsync(userId.Value);
                _context.UserNotifications.Add(new UserNotification
                {
                    UserId = comment.AuthorId,
                    ActorId = userId.Value,
                    Type = "LIKE",
                    CommentId = commentId,
                    Message = $"@{actor?.Username} liked your response."
                });
            }
        }

        await _context.SaveChangesAsync();
        var count = await _context.ForumCommentLikes.CountAsync(l => l.CommentId == commentId);
        return Ok(new { success = true, liked, likesCount = count });
    }

    // ==========================================
    // 10. NOTIFICATIONS FEED & MARK AS READ
    // ==========================================
    [HttpGet("notifications")]
    [Authorize]
    public async Task<IActionResult> GetNotifications()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var list = await _context.UserNotifications
            .Include(n => n.Actor)
            .Where(n => n.UserId == userId.Value)
            .OrderByDescending(n => n.CreatedAt)
            .Take(30)
            .Select(n => new
            {
                n.Id,
                n.Type,
                n.Message,
                n.ThreadId,
                n.CommentId,
                n.IsRead,
                n.CreatedAt,
                Actor = new
                {
                    n.Actor!.Id,
                    Username = n.Actor.Username,
                    DisplayName = !string.IsNullOrWhiteSpace(n.Actor.DisplayName) ? n.Actor.DisplayName : n.Actor.Username,
                    n.Actor.AvatarUrl,
                    Faction = n.Actor.Faction.ToString()
                }
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost("notifications/mark-read")]
    [Authorize]
    public async Task<IActionResult> MarkNotificationsRead()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var unread = await _context.UserNotifications
            .Where(n => n.UserId == userId.Value && !n.IsRead)
            .ToListAsync();

        unread.ForEach(n => n.IsRead = true);
        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }

    // ==========================================
    // 11. PUBLIC OPERATIVE DOSSIER / PROFILE POPUP
    // ==========================================
    [HttpGet("profile/{username}")]
    public async Task<IActionResult> GetUserProfile(string username)
    {
        var clean = username.Trim().ToLower();
        var user = await _context.UserProfiles
            .FirstOrDefaultAsync(u => u.Username.ToLower() == clean);

        if (user == null) return NotFound("Operative not found.");

        var threadsCount = await _context.ForumThreads.CountAsync(t => t.AuthorId == user.Id);
        var totalLikesReceived = await _context.ForumThreadLikes.CountAsync(l => l.Thread!.AuthorId == user.Id);

        return Ok(new
        {
            user.Id,
            user.Username,
            DisplayName = !string.IsNullOrWhiteSpace(user.DisplayName) ? user.DisplayName : user.Username,
            user.AvatarUrl,
            Faction = user.Faction.ToString(),
            Role = user.Role.ToString(),
            Gender = user.Gender.ToString(),
            user.QuestPoints,
            user.EventCredits,
            user.CreatedAt,
            Stats = new { threadsCount, totalLikesReceived }
        });
    }
}