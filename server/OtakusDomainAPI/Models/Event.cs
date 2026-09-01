using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OtakusDomainAPI.Models;

public enum TicketStageType
{
    PresaleVoucher = 0,
    EarlyBird = 1,
    Standard = 2,
    LateSurge = 3,
    VIPBackstage = 4
}

public enum TicketStatus
{
    Active = 0,
    CheckedIn = 1,
    Cancelled = 2,
    Refunded = 3
}

public enum TransactionPaymentStatus
{
    Pending = 0,
    Success = 1,
    Failed = 2,
    Abandoned = 3
}

public enum PaymentPurpose
{
    EventTicket = 0,
    EventPresaleVoucher = 1,
    StoreOrder = 2
}

public class GuildEvent
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public string LocationName { get; set; } = string.Empty;
    public string VenueAddress { get; set; } = string.Empty;
    public DateTime EventDateUtc { get; set; }

    public string CoverImageUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; } = 0; 

    [Column(TypeName = "jsonb")]
    public string? MediaHypeReelsJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<EventTicketStage> TicketStages { get; set; } = new();
    public List<EventTicketPass> IssuedTickets { get; set; } = new();
}

public class EventTicketStage
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int EventId { get; set; }
    public GuildEvent? Event { get; set; }

    [Required]
    [MaxLength(100)]
    public string StageName { get; set; } = string.Empty;

    public TicketStageType StageType { get; set; } = TicketStageType.Standard;

    [Column(TypeName = "decimal(18,2)")]
    public decimal BasePrice { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal PresaleDiscountValue { get; set; } = 0.00m;

    public int TotalCapacity { get; set; }
    public int SoldCount { get; set; } = 0;

    public DateTime SalesStartTimeUtc { get; set; }
    public DateTime SalesEndTimeUtc { get; set; }

    public bool HidePriceUntilActive { get; set; } = false;
    public bool IsActive { get; set; } = true;
}

public class EventCoupon
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    public int? EventId { get; set; }
    public GuildEvent? Event { get; set; }

    public decimal DiscountPercent { get; set; } = 0;
    public decimal FlatDiscountAmount { get; set; } = 0;

    public int MaxUses { get; set; } = 100;
    public int CurrentUses { get; set; } = 0;

    public DateTime ExpiryDateUtc { get; set; }
    public bool IsActive { get; set; } = true;
}

public class EventTicketPass
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public int EventId { get; set; }
    public GuildEvent? Event { get; set; }

    [Required]
    public int TicketStageId { get; set; }
    public EventTicketStage? TicketStage { get; set; }

    [Required]
    public Guid UserId { get; set; }
    public UserProfile? User { get; set; }

    public string GuestName { get; set; } = string.Empty;
    public string GuestEmail { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal PurchaseAmount { get; set; }

    public bool IsPresaleVoucher { get; set; } = false;
    public bool HasUpgradedToFullTicket { get; set; } = false;

    public TicketStatus Status { get; set; } = TicketStatus.Active;
    public DateTime? CheckedInAt { get; set; }
    public string? CheckedInByOfficer { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? PaymentReference { get; set; }
    public bool IsPaid { get; set; } = false;
}

public class PaymentTransaction
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Reference { get; set; } = string.Empty;

    public string? PaystackTransactionId { get; set; }

    [Required]
    public Guid UserId { get; set; }
    public UserProfile? User { get; set; }

    [Required]
    [MaxLength(150)]
    public string CustomerEmail { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal AmountPaid { get; set; }

    public string? Channel { get; set; }
    public string Currency { get; set; } = "NGN";

    public TransactionPaymentStatus Status { get; set; } = TransactionPaymentStatus.Pending;
    public PaymentPurpose PaymentType { get; set; } = PaymentPurpose.EventTicket;

    public string? RelatedEntityId { get; set; }

    [Column(TypeName = "jsonb")]
    public string? GatewayResponseJson { get; set; }

    public DateTime? PaidAtUtc { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}