namespace BlogPostSiteAPI.Services
{
    public interface IEmailSender
    {
        Task SendAsync(string to, string subject, string body, string? from = null);
    }
}
