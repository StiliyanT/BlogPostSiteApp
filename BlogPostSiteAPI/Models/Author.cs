namespace BlogPostSiteAPI.Models
{
    public class Author
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public string Avatar { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        public ICollection<BlogPost>? BlogPosts { get; set; } = new List<BlogPost>();
    }
}