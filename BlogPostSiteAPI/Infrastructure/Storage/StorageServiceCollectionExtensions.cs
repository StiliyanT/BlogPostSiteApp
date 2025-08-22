using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;

namespace BlogPostSiteAPI.Infrastructure.Storage
{
    public static class StorageServiceCollectionExtensions
    {
        public static IServiceCollection AddContentStorage(this IServiceCollection services, IConfiguration config)
        {
            services.AddOptions<ContentStorageOptions>()
                .Bind(config.GetSection(ContentStorageOptions.SectionName))
                .ValidateDataAnnotations();

            // Defer directory creation until the app has fully built (avoid BuildServiceProvider during registration).
            services.AddSingleton<IHostedService>(sp =>
                new StorageStartupInitializer(
                    sp.GetRequiredService<IOptions<ContentStorageOptions>>(),
                    sp.GetRequiredService<IHostEnvironment>(),
                    sp.GetRequiredService<ILogger<StorageStartupInitializer>>()));

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

internal class StorageStartupInitializer : IHostedService
{
    private readonly IOptions<BlogPostSiteAPI.Infrastructure.Storage.ContentStorageOptions> _options;
    private readonly IHostEnvironment _env;
    private readonly ILogger<StorageStartupInitializer> _logger;

    public StorageStartupInitializer(IOptions<BlogPostSiteAPI.Infrastructure.Storage.ContentStorageOptions> options, IHostEnvironment env, ILogger<StorageStartupInitializer> logger)
    {
        _options = options; _env = env; _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            var opt = _options.Value;
            if (string.IsNullOrWhiteSpace(opt.PublicBasePath)) opt.PublicBasePath = "/static";
            if (!opt.PublicBasePath.StartsWith('/')) opt.PublicBasePath = "/" + opt.PublicBasePath.TrimStart('/');
            var root = opt.RootPhysicalPath;
            if (string.IsNullOrWhiteSpace(root)) root = "content"; // default relative
            root = root.Replace("${CONTENT_ROOT}", _env.ContentRootPath);
            root = root.Replace("%CONTENT_ROOT%", _env.ContentRootPath);
            root = root.Replace("{CONTENT_ROOT}", _env.ContentRootPath);
            if (!Path.IsPathFullyQualified(root))
                root = Path.GetFullPath(Path.Combine(_env.ContentRootPath, root));
            Directory.CreateDirectory(root);
            Directory.CreateDirectory(Path.Combine(root, "posts"));
            opt.RootPhysicalPath = root; // persist changed path
            _logger.LogInformation("Content storage initialized at {Root}", root);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize content storage");
        }
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
