using Microsoft.Extensions.Hosting;

namespace BlogPostSiteAPI.Infrastructure.Storage
{
    public static class StorageServiceCollectionExtensions
    {
        public static IServiceCollection AddContentStorage(this IServiceCollection services, IConfiguration config)
        {
            services.AddOptions<ContentStorageOptions>()
                .Bind(config.GetSection(ContentStorageOptions.SectionName))
                .ValidateDataAnnotations();

            // We need IHostEnvironment to resolve relative paths. Use a temporary provider at startup time.
            using (var sp = services.BuildServiceProvider())
            {
                var env = sp.GetRequiredService<IHostEnvironment>();
                services.PostConfigure<ContentStorageOptions>(o =>
                {
                    var root = ResolvePath(o.RootPhysicalPath, env.ContentRootPath);
                    // normalize request path
                    if (string.IsNullOrWhiteSpace(o.PublicBasePath)) o.PublicBasePath = "/static";
                    if (!o.PublicBasePath.StartsWith('/')) o.PublicBasePath = "/" + o.PublicBasePath.TrimStart('/');

                    o.RootPhysicalPath = root;
                    Directory.CreateDirectory(root);
                    Directory.CreateDirectory(Path.Combine(root, "posts"));
                });
            }

            services.AddScoped<IBlogContentStorage, LocalBlogContentStorage>();
            return services;
        }

        private static string ResolvePath(string configuredPath, string contentRoot)
        {
            var path = configuredPath ?? string.Empty;
            path = path.Replace("${CONTENT_ROOT}", contentRoot)
                       .Replace("%CONTENT_ROOT%", contentRoot)
                       .Replace("{CONTENT_ROOT}", contentRoot);
            if (!Path.IsPathFullyQualified(path))
            {
                path = Path.GetFullPath(Path.Combine(contentRoot, path));
            }
            return path;
        }
    }
}
