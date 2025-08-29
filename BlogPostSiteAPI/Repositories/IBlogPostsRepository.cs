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
    // Toggle like/unlike by user; returns new likes count
    Task<int> ToggleLikeAsync(string slug, string userId);

    // Get blog posts liked by a user (latest first)
    Task<IEnumerable<BlogPost>> GetLikedPostsByUserAsync(string userId);
    }
}
