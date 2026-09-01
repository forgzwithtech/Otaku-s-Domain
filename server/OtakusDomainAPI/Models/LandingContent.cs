using System.ComponentModel.DataAnnotations;

namespace OtakusDomainAPI.Models;

public class LandingSlide
{
    [Key]
    public int Id { get; set; }
    public string Panel { get; set; } = string.Empty;
    public string Tag { get; set; } = string.Empty;
    public string Stamp { get; set; } = string.Empty;
    public string Sfx { get; set; } = string.Empty;
    public string Title1 { get; set; } = string.Empty;
    public string Title2 { get; set; } = string.Empty;
    public string Kanji { get; set; } = string.Empty;
    public string Desc { get; set; } = string.Empty;
    public string BtnText { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = "/vault";
    
    // Member feature slot for birthdays/spotlights
    public string? MemberName { get; set; }
    public string? MemberAvatar { get; set; }
    public string? MemberQuote { get; set; }
    
    public int DisplayOrder { get; set; }
}

public class DailyTrial
{
    [Key]
    public int Id { get; set; }
    public string Question { get; set; } = string.Empty;
    public string CorrectAnswer { get; set; } = string.Empty;
    public int RewardPoints { get; set; } = 50;
    public DateTime ActiveDate { get; set; } = DateTime.UtcNow.Date;
}