using Microsoft.Extensions.Options;
using System.IO.Compression;
using System.Text.RegularExpressions;

namespace BlogPostSiteAPI.Infrastructure.Storage
{
    public record SaveResult(string Slug, string PostFolderAbsolutePath, string IndexMdxAbsolutePath, string AssetsRelativePath);

    public interface IBlogContentStorage
    {
        Task<SaveResult> SaveFromZipAsync(IFormFile zip, string? preferredSlug, CancellationToken ct);
        Task<bool> DeletePostFolderAsync(string slug, CancellationToken ct);
        string BuildPublicUrl(string absoluteFilePath);   // maps to /static/...
        string GetPostFolderAbsolutePath(string slug);
    }
    public class LocalBlogContentStorage : IBlogContentStorage
    {
        private readonly ContentStorageOptions _opts;

    public LocalBlogContentStorage(IOptions<ContentStorageOptions> options, ILogger<LocalBlogContentStorage> logger = null!)
        {
            _opts = options.Value;
            // Directory creation is handled by StorageStartupInitializer. Here we just verify or fallback.
            try
            {
                if (!Directory.Exists(_opts.RootPhysicalPath))
                {
                    Directory.CreateDirectory(_opts.RootPhysicalPath);
                }
        logger?.LogInformation("LocalBlogContentStorage using root {Root}", _opts.RootPhysicalPath);
            }
            catch (UnauthorizedAccessException)
            {
                // Fallback to per-process temp folder to keep API functional (diagnostic log recommended)
                var tempRoot = Path.Combine(Path.GetTempPath(), "blog-content-fallback");
                try
                {
                    Directory.CreateDirectory(tempRoot);
                    _opts.RootPhysicalPath = tempRoot;
            logger?.LogWarning("Content root inaccessible, fell back to {Fallback}", tempRoot);
                }
                catch
                {
                    // If this also fails, rethrow original to surface clearly
                    throw;
                }
            }
        }

        public async Task<SaveResult> SaveFromZipAsync(IFormFile zip, string? preferredSlug, CancellationToken ct)
        {
            if (zip.Length == 0) throw new InvalidOperationException("Empty zip.");

            // Extract to temp
            var tempDir = Path.Combine(Path.GetTempPath(), "blog-upload-" + Guid.NewGuid());
            Directory.CreateDirectory(tempDir);
            var tempZipPath = Path.Combine(tempDir, "upload.zip");
            await using (var fs = File.Create(tempZipPath))
                await zip.CopyToAsync(fs, ct);

            ZipFile.ExtractToDirectory(tempZipPath, tempDir);

            // Find root folder that has index.mdx (support zips with or without nested folder)
            var candidateDirs = Directory.GetDirectories(tempDir, "*", SearchOption.TopDirectoryOnly)
                .Where(d => File.Exists(Path.Combine(d, "index.mdx"))).ToList();

            string sourceRoot;
            if (candidateDirs.Count == 1)
                sourceRoot = candidateDirs[0];
            else if (File.Exists(Path.Combine(tempDir, "index.mdx")))
                sourceRoot = tempDir;
            else
                throw new InvalidOperationException("Zip must contain a folder (or root) with index.mdx.");

            // Determine slug
            var slugFromFolder = Path.GetFileName(sourceRoot.TrimEnd(Path.DirectorySeparatorChar));
            var slug = Slugify(!string.IsNullOrWhiteSpace(preferredSlug) ? preferredSlug : slugFromFolder);

            // Ensure slug uniqueness
            slug = EnsureUniqueSlug(slug);

            // Move to final folder
            var destPostFolder = GetPostFolderAbsolutePath(slug);
            Directory.CreateDirectory(destPostFolder);

            // Copy all files
            foreach (var dirPath in Directory.GetDirectories(sourceRoot, "*", SearchOption.AllDirectories))
                Directory.CreateDirectory(dirPath.Replace(sourceRoot, destPostFolder));

            foreach (var newPath in Directory.GetFiles(sourceRoot, "*.*", SearchOption.AllDirectories))
                File.Copy(newPath, newPath.Replace(sourceRoot, destPostFolder), overwrite: true);

            // Normalize assets folder name; assume "assets" if present
            var assetsRel = Directory.Exists(Path.Combine(destPostFolder, "assets")) ? "assets" : string.Empty;

            var indexMdx = Path.Combine(destPostFolder, "index.mdx");
            if (!File.Exists(indexMdx))
                throw new InvalidOperationException("index.mdx missing after extraction.");

            // Cleanup temp
            try { Directory.Delete(tempDir, true); } catch { /* ignore */ }

            return new SaveResult(slug, destPostFolder, indexMdx, assetsRel);
        }

        public Task<bool> DeletePostFolderAsync(string slug, CancellationToken ct)
        {
            var dir = GetPostFolderAbsolutePath(slug);
            if (!Directory.Exists(dir)) return Task.FromResult(false);
            Directory.Delete(dir, true);
            return Task.FromResult(true);
        }

        public string BuildPublicUrl(string absoluteFilePath)
        {
            // absoluteFilePath = C:\data\blog-content\posts\my-slug\assets\hero.jpg
            var rel = Path.GetRelativePath(_opts.RootPhysicalPath, absoluteFilePath).Replace('\\', '/');
            return $"{_opts.PublicBasePath}/{rel}";
        }

        public string GetPostFolderAbsolutePath(string slug)
            => Path.Combine(_opts.RootPhysicalPath, "posts", slug);

        private string EnsureUniqueSlug(string baseSlug)
        {
            var slug = baseSlug;
            var i = 1;
            while (Directory.Exists(GetPostFolderAbsolutePath(slug)))
                slug = $"{baseSlug}-{i++}";
            return slug;
        }

        private static string Slugify(string input)
        {
            var s = input.ToLowerInvariant();
            s = Regex.Replace(s, @"[^a-z0-9\-]+", "-");
            s = Regex.Replace(s, @"\-{2,}", "-").Trim('-');
            return string.IsNullOrEmpty(s) ? Guid.NewGuid().ToString("n") : s;
        }
    }
}
