namespace BlogPostSiteAPI.Models
{
    public class Category
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public ICollection<BlogPost>? BlogPosts { get; set; } = new List<BlogPost>();
    }
}
