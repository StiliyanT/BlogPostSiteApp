using BlogPostSiteAPI.Contracts.BlogPosts.Admin;
using BlogPostSiteAPI.Contracts.BlogPosts.Public;
using BlogPostSiteAPI.Infrastructure.Content.Mdx;
using BlogPostSiteAPI.Infrastructure.Storage;
using BlogPostSiteAPI.Models;
using BlogPostSiteAPI.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
//using Microsoft.Identity.Client.Extensions.Msal;
using Utils.BlogPostStatus;
using Microsoft.AspNetCore.Authorization;

namespace BlogPostSiteAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BlogPostsController : ControllerBase
    {

        private readonly IBlogPostsRepository _repo;
        private readonly IBlogContentStorage _storage;
        private readonly ContentStorageOptions _opts;

        public static class BlogPostRoutes
{
    public const string GetBySlug = "BlogPosts_GetBySlug";
}

        public BlogPostsController(
        IBlogPostsRepository repo,
        IBlogContentStorage storage,
        IOptions<ContentStorageOptions> opts)
        {
            _repo = repo;
            _storage = storage;
            _opts = opts.Value;
        }

        // GET: api/<BlogPostsController>
        [HttpGet]
        public async Task<IActionResult> GetAllBlogPostsAsync()
        {
            var posts = await _repo.GetAllBlogPostsAsync();
            var list = posts
                .Select(p => new BlogPostListItemResponse(p.Id, p.Slug, p.Title, p.Summary, p.CreatedOn, p.ModifiedOn, p.Status, p.Likes, p.Views))
                .ToList();
            Console.WriteLine($"[BlogPostsController] Returning {list.Count} posts");
            return Ok(list);
        }

        // GET api/<BlogPostsController>/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetBlogPostByIdAsync(Guid id)
        {
            var blogPost = await _repo.GetBlogPostByIdAsync(id);
            if (blogPost == null) return NotFound("No entity with such Id.");
            return Ok(blogPost);
        }

        [HttpGet("slug/{slug}", Name = BlogPostRoutes.GetBySlug)]
        public async Task<IActionResult> GetBySlugAsync(string slug, CancellationToken ct)
        {
            var post = await _repo.GetBySlugAsync(slug);
            if (post is null) return NotFound();

            var indexPath = Path.Combine(post.ContentPath, "index.mdx");
            if (!System.IO.File.Exists(indexPath)) return NotFound("index.mdx not found.");
            var mdx = await System.IO.File.ReadAllTextAsync(indexPath, ct);

            string? heroUrl = null;
            if (!string.IsNullOrWhiteSpace(post.HeroImageRelativePath))
            {
                var abs = Path.Combine(post.ContentPath, post.HeroImageRelativePath);
                heroUrl = _storage.BuildPublicUrl(abs);
            }



            return Ok(new
            {
                Id = post.Id,
                Slug = post.Slug,
                Title = post.Title,
                Summary = post.Summary,
                CreatedOn = post.CreatedOn,
                ModifiedOn = post.ModifiedOn,
                Status = post.Status,
                Content = mdx,
                HeroUrl = heroUrl,
                Likes = post.Likes,
                Views = post.Views
            });
        }

        // POST api/blogposts/upload
    [HttpPost("upload")]
    [Authorize(Policy = "Admin")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(104_857_600)] // 100 MB cap (tune as needed)
        public async Task<IActionResult> UploadZipAsync(IFormFile file, [FromForm] string? slug, CancellationToken ct)
        {
            if (file == null || file.Length == 0) return BadRequest("Upload a non-empty zip file.");
            if (!file.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase)) return BadRequest("Only .zip is supported.");

            // Save & extract
            var saved = await _storage.SaveFromZipAsync(file, slug, ct);

            // Read MDX & front-matter
            var mdx = await System.IO.File.ReadAllTextAsync(saved.IndexMdxAbsolutePath, ct);
            var fm = MdxFrontMatter.Parse(mdx);

            // Derive post fields
            var title = !string.IsNullOrWhiteSpace(fm.Title) ? fm.Title : (fm.Title ?? saved.Slug.Replace('-', ' '));
            var summary = fm.Summary ?? string.Empty;

            string? heroRel = null;
            string? heroUrl = null;
            if (!string.IsNullOrWhiteSpace(fm.Hero))
            {
                // Normalize relative path under post folder (e.g. "assets/hero.jpg" or "./assets/hero.jpg")
                heroRel = fm.Hero.TrimStart('.', '/', '\\').Replace('\\', '/');
                var heroAbs = Path.Combine(saved.PostFolderAbsolutePath, heroRel);
                if (System.IO.File.Exists(heroAbs))
                    heroUrl = _storage.BuildPublicUrl(heroAbs);
                else
                    heroRel = null; // invalid ref
            }

            // Persist DB row
            var post = new BlogPost
            {
                Title = title,
                Summary = summary,
                Slug = saved.Slug,
                ContentPath = saved.PostFolderAbsolutePath,
                CreatedOn = DateTime.UtcNow,
                ModifiedOn = DateTime.UtcNow,
                Status = BlogPostStatus.Draft,
                PublishedOn = null,
                HeroImageRelativePath = heroRel
            };

            var created = await _repo.CreateBlogPostAsync(post);

            // Optionally also expose a public URL to index.mdx (useful if you want the FE to fetch raw MDX file directly)
            var publicIndexUrl = _storage.BuildPublicUrl(saved.IndexMdxAbsolutePath);

            var response = new
            {
                created.Id,
                created.Slug,
                created.Title,
                created.Summary,
                publicIndexUrl,
                heroUrl
            };

            return CreatedAtAction(nameof(GetBySlugAsync), new { slug = created.Slug }, response);
        }

        // Optional: publish endpoint
    [HttpPost("{id:guid}/publish")]
    [Authorize(Policy = "Admin")]
        public async Task<IActionResult> PublishAsync(Guid id)
        {
            var post = await _repo.GetBlogPostByIdAsync(id);
            if (post == null) return NotFound();

            post.Status = BlogPostStatus.Published;
            post.PublishedOn = DateTime.UtcNow;
            post.ModifiedOn = DateTime.UtcNow;

            await HttpContext.RequestServices.GetRequiredService<BlogDbContext>().SaveChangesAsync();
            return Ok();
        }

        // POST api/<BlogPostsController>
        [HttpPost]
        public async Task<IActionResult> CreateBlogPostAsync(BlogPost blogPost)
        {
            var posts = await _repo.GetAllBlogPostsAsync();
            var list = posts
                .Select(p => new BlogPostListItemResponse(p.Id, p.Slug, p.Title, p.Summary, p.CreatedOn, p.ModifiedOn, p.Status, p.Likes, p.Views))
                .ToList();
            try
            {
                var json = System.Text.Json.JsonSerializer.Serialize(list);
                Console.WriteLine($"[BlogPostsController] Manual serialize count={list.Count} bytes={json.Length}");
                Response.ContentType = "application/json";
                Response.ContentLength = System.Text.Encoding.UTF8.GetByteCount(json);
                await Response.WriteAsync(json);
                return new EmptyResult();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[BlogPostsController] Serialize failed: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        //POST api/<BlogPostsController>/5/likes
        [HttpPost("slug/{slug}/like")]
        public async Task<IActionResult> UpdateBlogPostLikesAsync(string slug)
        {
            var post = await _repo.GetBySlugAsync(slug);
            if (post == null) return NotFound();

            var updatedLikes = await _repo.UpdateBlogPostLikesAsync(post);

            return Ok(new { likes = updatedLikes });

        }

        // POST api/blogposts/slug/{slug}/view
        // For now, do a cheap increment; later you can buffer via Redis/queue and batch-update.
        [HttpPost("slug/{slug}/view")]
        public async Task<IActionResult> TrackViewAsync(string slug)
        {
            var post = await _repo.GetBySlugAsync(slug);
            if (post == null) return NotFound();

            // Naive increment guarded by short-circuit; replace with buffering service when ready.
            post.Views += 1;
            post.ModifiedOn = DateTime.UtcNow;
            await HttpContext.RequestServices.GetRequiredService<BlogDbContext>().SaveChangesAsync();
            return Ok();
        }

        //// PUT api/<BlogPostsController>/5
        //[HttpPut("{id}")]
        //public async Task<IActionResult> Put(BlogPost blogPost)
        //{
        //    return Ok();
        //}

        // DELETE api/<BlogPostsController>/5
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Admin")]
        public async Task<IActionResult> DeleteBlogPostAsync(Guid id, CancellationToken ct)
        {
            // Optional: also delete folder by slug
            var post = await _repo.GetBlogPostByIdAsync(id);
            if (post != null) await _storage.DeletePostFolderAsync(post.Slug, ct);

            var isFoundAndDeleted = await _repo.DeleteBlogPostAsync(id);
            if (!isFoundAndDeleted) return NotFound("No entity with given Id.");
            return Ok();
        }
    }
}
