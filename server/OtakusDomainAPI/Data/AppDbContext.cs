using Microsoft.EntityFrameworkCore;
using OtakusDomainAPI.Models;

namespace OtakusDomainAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<LandingSlide> LandingSlides => Set<LandingSlide>();
    public DbSet<DailyTrial> DailyTrials => Set<DailyTrial>();
    public DbSet<RecruitmentSubmission> RecruitmentSubmissions => Set<RecruitmentSubmission>();
    public DbSet<Sponsor> Sponsors => Set<Sponsor>();
    public DbSet<ForumCategory> ForumCategories => Set<ForumCategory>();
    public DbSet<ForumThread> ForumThreads => Set<ForumThread>();   
    public DbSet<ForumComment> ForumComments => Set<ForumComment>();
    public DbSet<GuildEvent> GuildEvents => Set<GuildEvent>();
    public DbSet<EventTicketStage> EventTicketStages => Set<EventTicketStage>();
    public DbSet<EventCoupon> EventCoupons => Set<EventCoupon>();
    public DbSet<EventTicketPass> EventTicketPasses => Set<EventTicketPass>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();

    // Simplified Store Module Sets
    public DbSet<StoreCategory> StoreCategories => Set<StoreCategory>();
    public DbSet<StoreCollectionDrop> StoreCollectionDrops => Set<StoreCollectionDrop>();
    public DbSet<StoreProduct> StoreProducts => Set<StoreProduct>();
    public DbSet<StoreProductVariant> StoreProductVariants => Set<StoreProductVariant>();
    public DbSet<StoreOrder> StoreOrders => Set<StoreOrder>();
    public DbSet<StoreOrderItem> StoreOrderItems => Set<StoreOrderItem>();
  
public DbSet<ForumThreadLike> ForumThreadLikes => Set<ForumThreadLike>();
public DbSet<ForumCommentLike> ForumCommentLikes => Set<ForumCommentLike>();
public DbSet<UserNotification> UserNotifications => Set<UserNotification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.Username).IsUnique();
            entity.Property(u => u.Faction).HasConversion<string>();
            entity.Property(u => u.Role).HasConversion<string>();
            entity.Property(u => u.Gender).HasConversion<string>();
        });

        modelBuilder.Entity<EventTicketStage>()
            .Property(s => s.StageType)
            .HasConversion<string>();

        modelBuilder.Entity<EventTicketPass>()
            .Property(p => p.Status)
            .HasConversion<string>();

        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.Property(t => t.Status).HasConversion<string>();
            entity.Property(t => t.PaymentType).HasConversion<string>();
        });

        modelBuilder.Entity<StoreOrder>()
            .Property(o => o.OrderStatus)
            .HasConversion<string>();
    }
}