using Microsoft.EntityFrameworkCore;
using BlogPostSiteAPI.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

public class BlogDbContext : IdentityDbContext<ApplicationUser>
{
    public BlogDbContext(DbContextOptions<BlogDbContext> options)
        : base(options) { }

    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<Author> Authors => Set<Author>();
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
    base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<BlogPost>(b =>
        {
            b.Property(p => p.Id).ValueGeneratedOnAdd();
            // enforce one-of-a-kind slug
            b.HasIndex(p => p.Slug).IsUnique();

            // (nice-to-have) basic constraints
            b.Property(p => p.Slug).IsRequired().HasMaxLength(200);
            b.Property(p => p.Title).IsRequired().HasMaxLength(200);

            // (optional) keep FKs optional and avoid cascade deletes
            b.HasOne(p => p.Author)
             .WithMany(a => a.BlogPosts)          // <-- point to the actual inverse collection
             .HasForeignKey(p => p.AuthorId)      // <-- use the FK property you already have
             .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(p => p.Category)
             .WithMany(c => c.BlogPosts)          // <-- point to the actual inverse collection
             .HasForeignKey(p => p.CategoryId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Author>(b =>
        {
            b.Property(a => a.Id).ValueGeneratedOnAdd();
        });

        modelBuilder.Entity<Category>(b =>
        {
            b.Property(c => c.Id).ValueGeneratedOnAdd();
        });

    // MySQL-oriented conventions
    // Avoid DB-level UUID() defaults for Guid PKs since some MySQL versions reject DEFAULT UUID().
    // EF Core will generate Guid values client-side for keys on Add when not supplied.

    // Set higher-precision datetime where appropriate (example on BlogPost timestamps)
        modelBuilder.Entity<BlogPost>()
            .Property(p => p.CreatedOn)
            .HasColumnType("datetime(6)");
        modelBuilder.Entity<BlogPost>()
            .Property(p => p.ModifiedOn)
            .HasColumnType("datetime(6)");
    }
}