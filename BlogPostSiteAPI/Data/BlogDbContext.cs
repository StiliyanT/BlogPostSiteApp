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
    }
}