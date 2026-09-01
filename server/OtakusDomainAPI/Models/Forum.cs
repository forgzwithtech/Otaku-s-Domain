using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OtakusDomainAPI.Models;

public class ForumCategory
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = "💬";
    public bool Is18PlusOnly { get; set; } = false;
    public int DisplayOrder { get; set; } = 0;
}

public class ForumThread
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int CategoryId { get; set; }
    public ForumCategory? Category { get; set; }

    [Required]
    public Guid AuthorId { get; set; }
    [ForeignKey("AuthorId")]
    public UserProfile? Author { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    // AniList Media Linkage
    public int? MediaId { get; set; }
    public string? MediaType { get; set; } // "ANIME" | "MANGA"
    public string? MediaTitle { get; set; }
    public string? MediaCoverUrl { get; set; }
    public int? MediaScore { get; set; }

    public bool IsPinned { get; set; } = false;
    public bool IsLocked { get; set; } = false;
    public int ViewCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<ForumComment> Comments { get; set; } = new();
}

public class ForumComment
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ThreadId { get; set; }
    public ForumThread? Thread { get; set; }

    [Required]
    public Guid AuthorId { get; set; }
    [ForeignKey("AuthorId")]
    public UserProfile? Author { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}