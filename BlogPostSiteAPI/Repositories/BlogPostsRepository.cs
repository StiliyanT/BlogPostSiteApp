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

            // If an AuthorId was provided, try to attach the Author navigation
            if (blogPost.AuthorId != null && blogPost.Author == null)
            {
                var author = await _dbContext.Authors.FirstOrDefaultAsync(a => a.Id == blogPost.AuthorId.Value);
                if (author != null)
                {
                    // attach existing author to ensure relationship is created and navigation is populated
                    blogPost.Author = author;
                }
            }

            // If a CategoryId was provided, attach the Category navigation to avoid EF tracking issues
            if (blogPost.CategoryId != null && blogPost.Category == null)
            {
                var category = await _dbContext.Categories.FirstOrDefaultAsync(c => c.Id == blogPost.CategoryId.Value);
                if (category != null)
                {
                    blogPost.Category = category;
                }
            }

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
            => await _dbContext.BlogPosts.AsNoTracking()
                .Include(p => p.Author)
                .Include(p => p.Category)
                .FirstOrDefaultAsync(p => p.Slug == slug);

        // Return a tracked entity for update operations (no AsNoTracking)
        public async Task<BlogPost?> GetBySlugForUpdateAsync(string slug)
            => await _dbContext.BlogPosts
                .Include(p => p.Author)
                .Include(p => p.Category)
                .FirstOrDefaultAsync(p => p.Slug == slug);

        public async Task<bool> SlugExistsAsync(string slug)
        => await _dbContext.BlogPosts.AnyAsync(p => p.Slug == slug);

        public async Task<int> UpdateBlogPostLikesAsync(BlogPost blogPost)
        {
            blogPost.Likes += 1;
            _dbContext.BlogPosts.Update(blogPost);
            await _dbContext.SaveChangesAsync();
            return blogPost.Likes;
        }

        public async Task<int> ToggleLikeAsync(string slug, string userId)
        {
            var post = await _dbContext.BlogPosts.FirstOrDefaultAsync(p => p.Slug == slug);
            if (post == null) throw new InvalidOperationException("Post not found");

            var existing = await _dbContext.UserLikedPosts.FirstOrDefaultAsync(x => x.UserId == userId && x.BlogPostId == post.Id);
            if (existing != null)
            {
                // remove like
                _dbContext.UserLikedPosts.Remove(existing);
                post.Likes = Math.Max(0, post.Likes - 1);
            }
            else
            {
                // add like
                var like = new Models.UserLikedPost { UserId = userId, BlogPostId = post.Id, LikedOn = DateTime.UtcNow };
                await _dbContext.UserLikedPosts.AddAsync(like);
                post.Likes += 1;
            }
            _dbContext.BlogPosts.Update(post);
            await _dbContext.SaveChangesAsync();
            return post.Likes;
        }

        public async Task<IEnumerable<BlogPost>> GetLikedPostsByUserAsync(string userId)
        {
            // join liked posts to blog posts and return the post entities
            var q = from lp in _dbContext.UserLikedPosts
                    join p in _dbContext.BlogPosts on lp.BlogPostId equals p.Id
                    where lp.UserId == userId
                    orderby lp.LikedOn descending
                    select p;
            return await q.AsNoTracking().ToListAsync();
        }
    }
}
