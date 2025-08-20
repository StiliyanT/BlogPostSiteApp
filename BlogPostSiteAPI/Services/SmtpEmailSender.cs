using System.Net;
using System.Net.Mail;
using System.Text;

namespace BlogPostSiteAPI.Services
{
    public sealed class SmtpEmailSender : IEmailSender
    {
        private readonly IConfiguration _config;
        private readonly ILogger<SmtpEmailSender> _logger;

        public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> logger)
        {
            _config = config;
            _logger = logger;
        }

    public async Task SendAsync(string to, string subject, string body, string? from = null)
        {
            var section = _config.GetSection("Email:Smtp");
            var host = section["Host"];
            var portStr = section["Port"];
            var user = section["User"];
            var pass = section["Password"];
            var enableSsl = bool.TryParse(section["EnableSsl"], out var es) ? es : true;
            var fromAddr = from ?? section["From"] ?? user ?? "no-reply@example.com";

            if (string.IsNullOrWhiteSpace(host))
                throw new InvalidOperationException("SMTP Host is not configured (Email:Smtp:Host)");

            if (!int.TryParse(portStr, out var port)) port = 587;

            using var client = new SmtpClient(host, port)
            {
                DeliveryMethod = SmtpDeliveryMethod.Network,
                EnableSsl = enableSsl,
                UseDefaultCredentials = false,
                Credentials = string.IsNullOrWhiteSpace(user) ? null : new NetworkCredential(user, pass)
            };

            using var msg = new MailMessage(fromAddr, to);
            // Subject and body encodings
            msg.SubjectEncoding = Encoding.UTF8;
            msg.BodyEncoding = Encoding.UTF8;
            msg.IsBodyHtml = false;
            msg.Subject = subject;
            msg.Body = body;

            try
            {
                await client.SendMailAsync(msg);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {To}", to);
                throw;
            }
        }
    }
}
