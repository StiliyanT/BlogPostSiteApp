using System.ComponentModel.DataAnnotations;

namespace BlogPostSiteAPI.Contracts.BlogPosts.Admin
{
    public record UploadBlogPostRequest(
        [Required] IFormFile File,
    string? Slug,
    Guid? AuthorId
    );
}
