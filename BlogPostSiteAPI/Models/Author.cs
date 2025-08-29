namespace BlogPostSiteAPI.Models
{
    public class Author
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public string Avatar { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    // human-friendly slug for URLs (unique)
    public string Slug { get; set; } = string.Empty;

    // optional link to an ApplicationUser (Identity) when this author is mapped to a user account
    public string? ApplicationUserId { get; set; }
    public ApplicationUser? User { get; set; }

        public ICollection<BlogPost>? BlogPosts { get; set; } = new List<BlogPost>();
    }
}