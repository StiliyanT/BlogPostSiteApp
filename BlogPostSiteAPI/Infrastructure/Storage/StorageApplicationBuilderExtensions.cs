using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;

namespace BlogPostSiteAPI.Infrastructure.Storage
{
    public static class StorageApplicationBuilderExtensions
    {
        public static IApplicationBuilder UseContentStorageStaticFiles(this IApplicationBuilder app)
        {
            var opts = app.ApplicationServices
                          .GetRequiredService<IOptions<ContentStorageOptions>>()
                          .Value;

            // Ensure RootPhysicalPath is absolute (StorageStartupInitializer may not have run yet when this is called).
            try
            {
                var env = app.ApplicationServices.GetRequiredService<Microsoft.Extensions.Hosting.IHostEnvironment>();
                var root = opts.RootPhysicalPath ?? string.Empty;
                root = root.Replace("${CONTENT_ROOT}", env.ContentRootPath)
                           .Replace("%CONTENT_ROOT%", env.ContentRootPath)
                           .Replace("{CONTENT_ROOT}", env.ContentRootPath);
                if (!System.IO.Path.IsPathFullyQualified(root))
                {
                    root = System.IO.Path.GetFullPath(System.IO.Path.Combine(env.ContentRootPath, string.IsNullOrWhiteSpace(root) ? "wwwroot/static" : root));
                }

                return app.UseStaticFiles(new StaticFileOptions
                {
                    FileProvider = new PhysicalFileProvider(root),
                    RequestPath = opts.PublicBasePath
                });
            }
            catch (Exception ex)
            {
                // Let caller catch/log; rethrow to preserve behavior if desired
                throw new ArgumentException("Failed to configure content storage static files: " + ex.Message, ex);
            }
        }
    }
}
