using BlogPostSiteAPI.Contracts.BlogPosts.Admin;
using BlogPostSiteAPI.Infrastructure.Storage;             // IBlogContentStorage
using BlogPostSiteAPI.Infrastructure.Content.Mdx;         // MdxFrontMatter
using BlogPostSiteAPI.Models;
using BlogPostSiteAPI.Repositories;
using Microsoft.AspNetCore.Mvc;
using Utils.BlogPostStatus;
using BlogPostSiteAPI.Controllers;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/admin/blogposts")]
[Authorize(Policy = "Admin")]
public class AdminBlogPostsController : ControllerBase
{
    private readonly IBlogPostsRepository _repo;
    private readonly IBlogContentStorage _storage;
    private readonly IAuthorsRepository _authorsRepo;

    public AdminBlogPostsController(IBlogPostsRepository repo, IBlogContentStorage storage, IAuthorsRepository authorsRepo)
    {
        _repo = repo;
        _storage = storage;
        _authorsRepo = authorsRepo;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(104_857_600)] // 100MB
    public async Task<IActionResult> UploadZipAsync(
        IFormFile file,
        [FromForm] string? slug,
        [FromForm] Guid? authorId,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Upload a non-empty .zip file.");
        if (!file.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only .zip is supported.");

        var saved = await _storage.SaveFromZipAsync(file, slug, ct);

        var indexPath = Path.Combine(saved.PostFolderAbsolutePath, "index.mdx");
        if (!System.IO.File.Exists(indexPath))
            return BadRequest("index.mdx not found in uploaded zip.");

        var mdx = await System.IO.File.ReadAllTextAsync(indexPath, ct);
        var fm = MdxFrontMatter.Parse(mdx);

        var title = !string.IsNullOrWhiteSpace(fm.Title) ? fm.Title : saved.Slug.Replace('-', ' ');
        var summary = fm.Summary ?? string.Empty;

        string? heroRel = null;
        string? heroUrl = null;
        if (!string.IsNullOrWhiteSpace(fm.Hero))
        {
            heroRel = fm.Hero.TrimStart('.', '/', '\\').Replace('\\', '/');
            var heroAbs = Path.Combine(saved.PostFolderAbsolutePath, heroRel);
            if (System.IO.File.Exists(heroAbs))
                heroUrl = _storage.BuildPublicUrl(heroAbs);
            else
                heroRel = null;
        }

        if (heroRel is null)
        {
            var assetsDir = Path.Combine(saved.PostFolderAbsolutePath, "assets");
            if (Directory.Exists(assetsDir))
            {
                // look only at top-level; switch to AllDirectories if you want nested images too
                var firstImageAbs = Directory.EnumerateFiles(assetsDir, "*.*", SearchOption.TopDirectoryOnly)
                    .FirstOrDefault(p =>
                    {
                        var ext = Path.GetExtension(p).ToLowerInvariant();
                        return ext == ".jpg" || ext == ".jpeg" || ext == ".png";
                    });

                if (firstImageAbs != null)
                {
                    heroRel = Path.GetRelativePath(saved.PostFolderAbsolutePath, firstImageAbs)
                                 .Replace('\\', '/'); // store as URL-style relative path
                    heroUrl = _storage.BuildPublicUrl(firstImageAbs);
                }
            }
        }

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

        if (authorId != null && authorId != Guid.Empty)
        {
            // validate author exists
            var found = await _authorsRepo.GetAuthorByIdAsync(authorId.Value);
            if (found == null)
            {
                return BadRequest("author not found");
            }
            post.AuthorId = authorId;
        }

        var created = await _repo.CreateBlogPostAsync(post);

        var publicIndexUrl = _storage.BuildPublicUrl(indexPath);
        var response = new UploadResponse(
            created.Id,
            created.Slug,
            created.Title,
            created.Summary,
            publicIndexUrl,
            heroUrl
        );

        return CreatedAtRoute(
             routeName: BlogPostsController.BlogPostRoutes.GetBySlug,
             routeValues: new { slug = created.Slug },
             value: response
         );
    }
}
