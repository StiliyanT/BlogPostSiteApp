using Utils.BlogPostStatus;

namespace BlogPostSiteAPI.Models
{
    public class BlogPost
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
        public DateTime CreatedOn { get; set; }
        public DateTime ModifiedOn { get; set; }
        public string ContentPath { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public BlogPostStatus Status { get; set; } = BlogPostStatus.Draft;
        public DateTime? PublishedOn { get; set; }
        public string? HeroImageRelativePath { get; set; }
        public int Likes { get; set; } = 0;
        public int Views { get; set; } = 0;
        // Foreign Keys  
        public Guid? AuthorId { get; set; }
        public Author? Author { get; set; }

        public Guid? CategoryId { get; set; }
        public Category? Category { get; set; }
    }
}
