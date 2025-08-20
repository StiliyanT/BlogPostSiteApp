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

            return app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(opts.RootPhysicalPath),
                RequestPath = opts.PublicBasePath
            });
        }
    }
}
