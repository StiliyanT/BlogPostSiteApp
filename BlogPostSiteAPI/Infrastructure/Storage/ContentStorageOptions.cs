using System.ComponentModel.DataAnnotations;

namespace BlogPostSiteAPI.Infrastructure.Storage
{
    public class ContentStorageOptions
    {
        public const string SectionName = "ContentStorage";

        [Required] public string RootPhysicalPath { get; set; } = string.Empty; // e.g. /var/www/content
        [Required] public string PublicBasePath { get; set; } = "/static";      // request path prefix
    }
}

