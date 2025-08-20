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
        string? HeroImageUrl
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
