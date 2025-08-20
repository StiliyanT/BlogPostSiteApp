using BlogPostSiteAPI.Models;

namespace BlogPostSiteAPI.Repositories
{
    public interface IBlogPostsRepository
    {
        Task<IEnumerable<BlogPost>> GetAllBlogPostsAsync();

        Task<BlogPost> GetBlogPostByIdAsync(Guid id);

        Task<BlogPost> CreateBlogPostAsync(BlogPost blogPost);

        Task<bool> DeleteBlogPostAsync(Guid id);

        Task<BlogPost?> GetBySlugAsync(string slug);

        Task<bool> SlugExistsAsync(string slug);

        Task<int> UpdateBlogPostLikesAsync(BlogPost blogPost);
    }
}
