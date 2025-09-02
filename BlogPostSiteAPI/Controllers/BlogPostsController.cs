using BlogPostSiteAPI.Contracts.BlogPosts.Admin;
using BlogPostSiteAPI.Contracts.BlogPosts.Public;
using BlogPostSiteAPI.Infrastructure.Content.Mdx;
using BlogPostSiteAPI.Contracts.BlogPosts.Public;
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

            // Resolve index.mdx robustly: contentPath may be a folder, or accidentally a file path.
            string? indexPath = null;

            try
            {
                // Candidate 1: ContentPath is a folder containing index.mdx
                var candidate1 = Path.Combine(post.ContentPath ?? string.Empty, "index.mdx");
                if (System.IO.File.Exists(candidate1)) indexPath = candidate1;

                // Candidate 2: ContentPath itself points to an index.mdx file
                if (indexPath == null && !string.IsNullOrWhiteSpace(post.ContentPath) && Path.GetFileName(post.ContentPath).Equals("index.mdx", StringComparison.OrdinalIgnoreCase) && System.IO.File.Exists(post.ContentPath))
                {
                    indexPath = post.ContentPath;
                }

                // Candidate 3: search for index.mdx anywhere under the content path
                if (indexPath == null && System.IO.Directory.Exists(post.ContentPath ?? string.Empty))
                {
                    var found = System.IO.Directory.GetFiles(post.ContentPath!, "index.mdx", SearchOption.AllDirectories).FirstOrDefault();
                    if (!string.IsNullOrEmpty(found) && System.IO.File.Exists(found)) indexPath = found;
                }
                // If we still don't have an indexPath, attempt to locate the post under the current configured content root.
                // This helps when posts were uploaded to a different physical root (for example, you changed ContentStorage__RootPhysicalPath).
                if (indexPath == null)
                {
                    try
                    {
                        // Common layout: {RootPhysicalPath}/posts/{slug}/index.mdx
                        if (!string.IsNullOrWhiteSpace(_opts.RootPhysicalPath))
                        {
                            var candidateA = Path.Combine(_opts.RootPhysicalPath, "posts", slug, "index.mdx");
                            if (System.IO.File.Exists(candidateA)) indexPath = candidateA;

                            // Some deployments accidentally include an extra 'posts' folder (wwwroot/static/posts/posts/...).
                            if (indexPath == null)
                            {
                                var candidateB = Path.Combine(_opts.RootPhysicalPath, "posts", "posts", slug, "index.mdx");
                                if (System.IO.File.Exists(candidateB)) indexPath = candidateB;
                            }

                            // If still not found, try searching for a folder named after the slug under the configured root (cheap breadth-limited search).
                            if (indexPath == null && System.IO.Directory.Exists(_opts.RootPhysicalPath))
                            {
                                var slugDirs = System.IO.Directory.GetDirectories(_opts.RootPhysicalPath, slug, SearchOption.AllDirectories);
                                foreach (var d in slugDirs)
                                {
                                    var cand = Path.Combine(d, "index.mdx");
                                    if (System.IO.File.Exists(cand)) { indexPath = cand; break; }
                                }
                            }
                        }
                    }
                    catch
                    {
                        // ignore IO exceptions here and fall through to NotFound
                    }
                }
            }
            catch
            {
                // If any IO errors occur, treat as not found and continue to return a clear NotFound below
            }

            if (indexPath == null) return NotFound("index.mdx not found.");

            var mdx = await System.IO.File.ReadAllTextAsync(indexPath, ct);

            string? heroUrl = null;
            if (!string.IsNullOrWhiteSpace(post.HeroImageRelativePath))
            {
                var abs = Path.Combine(post.ContentPath, post.HeroImageRelativePath);
                heroUrl = _storage.BuildPublicUrl(abs);
            }



            var response = new PostDetailResponse(
                post.Id,
                post.Slug,
                post.Title,
                post.Summary,
                post.CreatedOn,
                post.ModifiedOn,
                post.Status,
                mdx,
                heroUrl,
                post.Author == null ? null : new Contracts.BlogPosts.Public.AuthorResponse(
                    post.Author.Id,
                    post.Author.Name,
                    post.Author.Slug,
                    post.Author.Avatar
                )
                , post.Category == null ? null : new Contracts.BlogPosts.Public.CategoryResponse(
                    post.Category.Id,
                    post.Category.Name,
                    null
                )
            );

            return Ok(response);

        }

        // POST api/blogposts/upload
    [HttpPost("upload")]
    [Authorize(Policy = "Admin")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(104_857_600)] // 100 MB cap (tune as needed)
    public async Task<IActionResult> UploadZipAsync(IFormFile file, [FromForm] string? slug, [FromForm] Guid? authorId, [FromForm] Guid? categoryId, CancellationToken ct)
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

            // Optionally set author and category
            if (authorId.HasValue) post.AuthorId = authorId.Value;
            if (categoryId.HasValue) post.CategoryId = categoryId.Value;

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
            if (blogPost == null) return BadRequest();
            // Basic server-side initialization
            blogPost.Id = Guid.NewGuid();
            blogPost.CreatedOn = DateTime.UtcNow;
            blogPost.ModifiedOn = blogPost.CreatedOn;
            if (string.IsNullOrWhiteSpace(blogPost.Slug))
            {
                // naive slug generation from title but preserve original Title casing
                blogPost.Slug = Slugify(blogPost.Title ?? Guid.NewGuid().ToString("n"));
            }
            var created = await _repo.CreateBlogPostAsync(blogPost);
            return CreatedAtAction(nameof(GetBlogPostByIdAsync), new { id = created.Id }, created);
        }

        // Local slugify helper that preserves the source Title value while producing a URL-friendly slug.
        private static string Slugify(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return Guid.NewGuid().ToString("n");
            var s = input.Normalize(System.Text.NormalizationForm.FormKD);
            // Remove diacritics by filtering out non-spacing marks
            s = new string(s.Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray());
            s = s.Trim();
            // Replace non-alphanumeric with hyphen, collapse multiples, trim hyphens, lower-case slug only
            s = System.Text.RegularExpressions.Regex.Replace(s, "[^A-Za-z0-9]+", "-");
            s = System.Text.RegularExpressions.Regex.Replace(s, "-{2,}", "-").Trim('-');
            return s.ToLowerInvariant();
        }

        // POST api/blogposts/slug/{slug}/like
        // Toggle like/unlike; requires authenticated user
        [HttpPost("slug/{slug}/like")]
        [Authorize]
        public async Task<IActionResult> ToggleLikeAsync(string slug)
        {
            var userId = User?.FindFirst("sub")?.Value ?? User?.Identity?.Name;
            if (string.IsNullOrWhiteSpace(userId)) return Forbid();

            try
            {
                var likes = await _repo.ToggleLikeAsync(slug, userId);
                return Ok(new { likes });
            }
            catch (InvalidOperationException)
            {
                return NotFound();
            }
        }

        // GET api/blogposts/liked
        // Returns the posts liked by the current user
        [HttpGet("liked")]
        [Authorize]
        public async Task<IActionResult> GetLikedByUserAsync()
        {
            var userId = User?.FindFirst("sub")?.Value ?? User?.Identity?.Name;
            if (string.IsNullOrWhiteSpace(userId)) return Forbid();

            var posts = await _repo.GetLikedPostsByUserAsync(userId);
            var list = posts.Select(p => new
            {
                p.Id,
                p.Slug,
                p.Title,
                p.Summary,
                p.CreatedOn,
                p.ModifiedOn,
                p.Status,
                p.Likes,
                p.Views
            }).ToList();
            return Ok(list);
        }

        // POST api/blogposts/slug/{slug}/view
        // For now, do a cheap increment; later you can buffer via Redis/queue and batch-update.
        [HttpPost("slug/{slug}/view")]
        public async Task<IActionResult> TrackViewAsync(string slug)
        {
            // Use a tracked entity so EF Core will persist modifications
            var post = await _repo.GetBySlugForUpdateAsync(slug);
            if (post == null) return NotFound();

            // Diagnostic log to help debug view-tracking during development
            try { Console.WriteLine($"[BlogPostsController] TrackViewAsync called for slug={slug}"); } catch { }

            // Naive increment; replace with buffered approach later if needed
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
