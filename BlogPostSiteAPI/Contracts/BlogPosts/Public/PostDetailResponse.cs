using Utils.BlogPostStatus;

namespace BlogPostSiteAPI.Contracts.BlogPosts.Public
{
    public record PostDetailResponse(
        Guid Id,
        string Slug,
        string Title,
        string Summary,
        DateTime CreatedOn,
        DateTime ModifiedOn,
        BlogPostStatus Status,
        string Mdx,
        string? HeroImageUrl,
        AuthorResponse? Author
    );

    public record AuthorResponse(
        Guid Id,
        string Name,
        string? Slug,
        string? Avatar
    );

    public record BlogPostListItemResponse(
        Guid Id,
        string Slug,
        string Title,
        string Summary,
        DateTime CreatedOn,
        DateTime ModifiedOn,
    BlogPostStatus Status,
        int Likes,
        int Views
    );
}
