using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace OtakusDomainAPI.Models;

public enum OrderStatus
{
    Pending = 0,
    Paid = 1,
    InProduction = 2,
    Shipped = 3,
    Delivered = 4,
    Cancelled = 5
}

public class StoreCategory
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? KanjiTitle { get; set; }

    public string? Description { get; set; }
    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    [JsonIgnore]
    public List<StoreProduct> Products { get; set; } = new();
}

public class StoreCollectionDrop
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? ThemeTag { get; set; }

    [MaxLength(100)]
    public string? KanjiSubtitle { get; set; }

    public string? BannerVideoUrl { get; set; }
    public string? BannerImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? DropDateUtc { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public List<StoreProduct> Products { get; set; } = new();
}

public class StoreProduct
{
    [Key]
    public int Id { get; set; }

    public int CategoryId { get; set; }
    public StoreCategory? Category { get; set; }

    public int? CollectionDropId { get; set; }
    public StoreCollectionDrop? CollectionDrop { get; set; }

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? Tagline { get; set; }

    public string? Description { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal BasePrice { get; set; }

    [Required]
    public string ThumbnailUrl { get; set; } = string.Empty;

    [Column(TypeName = "jsonb")]
    public string AvailableSizesJson { get; set; } = "[\"S\",\"M\",\"L\",\"XL\",\"XXL\"]";

    public bool IsFeatured { get; set; } = false;
    public bool IsSoldOut { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Color & Front/Back Variant Matrix
    public List<StoreProductVariant> ColorVariants { get; set; } = new();
}

public class StoreProductVariant
{
    [Key]
    public int Id { get; set; }

    public int ProductId { get; set; }

    [JsonIgnore]
    public StoreProduct? Product { get; set; }

    [Required, MaxLength(50)]
    public string ColorName { get; set; } = "Obsidian Black";

    [Required, MaxLength(20)]
    public string ColorHex { get; set; } = "#121212";

    // Dynamic array of any angle views: [ { "viewAngleName": "Front View", "imageUrl": "..." }, { "viewAngleName": "Back View", "imageUrl": "..." }, { "viewAngleName": "Side", "imageUrl": "..." } ]
    [Column(TypeName = "jsonb")]
    public string AngleImagesJson { get; set; } = "[]";

    [Column(TypeName = "decimal(18,2)")]
    public decimal AdditionalPrice { get; set; } = 0.00m;
}

public class StoreOrder
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(50)]
    public string OrderNumber { get; set; } = string.Empty;

    public Guid UserId { get; set; }
    public UserProfile? User { get; set; }

    [Required, MaxLength(100)]
    public string CustomerName { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string CustomerEmail { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string CustomerPhone { get; set; } = string.Empty;

    [Required]
    public string ShippingAddress { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string AkureZone { get; set; } = "FUTA South Gate Area";

    [Required, MaxLength(100)]
    public string City { get; set; } = "Akure";

    [Required, MaxLength(100)]
    public string State { get; set; } = "Ondo State";

    [Column(TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal DeliveryFee { get; set; } = 1500.00m;

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    public OrderStatus OrderStatus { get; set; } = OrderStatus.Pending;

    [MaxLength(100)]
    public string? PaymentReference { get; set; }
    public bool IsPaid { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<StoreOrderItem> Items { get; set; } = new();
}

public class StoreOrderItem
{
    [Key]
    public int Id { get; set; }

    public Guid OrderId { get; set; }

    [JsonIgnore]
    public StoreOrder? Order { get; set; }

    public int ProductId { get; set; }
    public StoreProduct? Product { get; set; }

    [Required, MaxLength(50)]
    public string SelectedColor { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string SelectedSize { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }

    public int Quantity { get; set; } = 1;

    [Column(TypeName = "jsonb")]
    public string? CustomizationDetailsJson { get; set; } // Stores selected Front V# and Back V#
}