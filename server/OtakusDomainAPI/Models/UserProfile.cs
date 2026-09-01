using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using OtakusDomainAPI.Enums;

namespace OtakusDomainAPI.Models;

public class UserProfile
{
    [Key]
    public Guid Id { get; set; } // Matches Supabase auth.users ID

    [Required]
    [MaxLength(100)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    public string? DisplayName { get; set; }

    public string? AvatarUrl { get; set; }

    // JSON string for modular anime avatar attributes (hair, eyes, accessories)
    [Column(TypeName = "jsonb")]
    public string? AvatarConfigJson { get; set; }

    public GuildFaction Faction { get; set; } = GuildFaction.None;

    public UserRole Role { get; set; } = UserRole.Member;

    public int QuestPoints { get; set; } = 0;

    public decimal EventCredits { get; set; } = 0.00m;

    public bool IsAgeVerified18Plus { get; set; } = false;

    public DateTime? DateOfBirth { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public UserGender Gender { get; set; } = UserGender.Unspecified;
}

public enum UserGender
{
    Unspecified = 0,
    Male = 1,
    Female = 2,
    NonBinary = 3,
    Other = 4
}