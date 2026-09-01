using System.ComponentModel.DataAnnotations;

namespace OtakusDomainAPI.Models;

public class RecruitmentSubmission
{
    [Key]
    public int Id { get; set; }
    public string Handle { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}