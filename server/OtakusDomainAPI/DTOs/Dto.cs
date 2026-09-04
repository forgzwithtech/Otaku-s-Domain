using System.ComponentModel.DataAnnotations;

namespace OtakusDomainAPI.DTOs;

public class UserProfileDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public string? AvatarConfigJson { get; set; }
    public string Faction { get; set; } = "None";
    public string Role { get; set; } = "Member";
    public int QuestPoints { get; set; }
    public decimal EventCredits { get; set; }
    public bool IsAgeVerified18Plus { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string Gender { get; set; } = string.Empty;
}

public class SetGuildDto
{
    public string Faction { get; set; } = "None";
}

public class TriviaSubmissionDto 
{ 
    public string Answer { get; set; } = string.Empty;
    public int? TrialId { get; set; }
}

public class RecruitmentDto
{
    [Required]
    public string Handle { get; set; } = string.Empty;
}

public class PledgeDto
{
    public string Faction { get; set; } = string.Empty;
}

public class VerifyAgeDto
{
    public DateTime DateOfBirth { get; set; }
}