using System.ComponentModel.DataAnnotations;

namespace OtakusDomainAPI.Models;

public class Sponsor
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = string.Empty;

    [Required]
    public string WebsiteUrl { get; set; } = string.Empty;

    public int DisplayOrder { get; set; } = 0;
}