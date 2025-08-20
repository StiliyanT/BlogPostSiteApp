using BlogPostSiteAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace BlogPostSiteAPI.Repositories
{
    public class BlogPostsRepository : IBlogPostsRepository
    {
        private readonly BlogDbContext _dbContext;

        public BlogPostsRepository(BlogDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        public async Task<BlogPost> CreateBlogPostAsync(BlogPost blogPost)
        {
            blogPost.Id = Guid.NewGuid();
            blogPost.CreatedOn = DateTime.UtcNow;
            blogPost.ModifiedOn = blogPost.CreatedOn;

            _dbContext.BlogPosts.Add(blogPost);
            await _dbContext.SaveChangesAsync();

            return blogPost;
        }

        public async Task<bool> DeleteBlogPostAsync(Guid id)
        {
            var blogPost = await _dbContext.BlogPosts.FirstOrDefaultAsync(x => x.Id == id);

            if (blogPost == null)
            {
                return false;
            }
            else
            {
                _dbContext.BlogPosts.Remove(blogPost);
                await _dbContext.SaveChangesAsync();

                return true;
            }
        }

        public async Task<IEnumerable<BlogPost>> GetAllBlogPostsAsync()
        {
            return await _dbContext.BlogPosts.AsNoTracking().ToListAsync();
        }

        public async Task<BlogPost> GetBlogPostByIdAsync(Guid id)
            => await _dbContext.BlogPosts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);

        public async Task<BlogPost?> GetBySlugAsync(string slug)
            => await _dbContext.BlogPosts.AsNoTracking().FirstOrDefaultAsync(p => p.Slug == slug);

        public async Task<bool> SlugExistsAsync(string slug)
        => await _dbContext.BlogPosts.AnyAsync(p => p.Slug == slug);

        public async Task<int> UpdateBlogPostLikesAsync(BlogPost blogPost)
        {
            blogPost.Likes += 1;
            _dbContext.BlogPosts.Update(blogPost);
            await _dbContext.SaveChangesAsync();
            return blogPost.Likes;
        }
    }
}
