namespace BlogPostSiteAPI.Contracts.BlogPosts.Admin
{
    public record UploadResponse(
        Guid Id,
        string Slug,
        string Title,
        string Summary,
        string ContentUrl,
        string? HeroImageUrl
    );
}
