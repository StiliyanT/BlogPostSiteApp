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
            // Helper: try multiple config sources and common env var names (Azure App Service uses __ for nested keys)
            string? GetSetting(string key)
            {
                // 1) IConfiguration with colon path
                var v = _config[$"Email:Smtp:{key}"];
                if (!string.IsNullOrWhiteSpace(v)) return v;

                // 2) Environment variable with double-underscore (Email__Smtp__Host)
                v = Environment.GetEnvironmentVariable($"Email__Smtp__{key}");
                if (!string.IsNullOrWhiteSpace(v)) return v;

                // 3) Common flat SMTP env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_ENABLE_SSL)
                var alt = key.ToUpper() switch
                {
                    "HOST" => "SMTP_HOST",
                    "PORT" => "SMTP_PORT",
                    "USER" => "SMTP_USER",
                    "PASSWORD" => "SMTP_PASS",
                    "FROM" => "SMTP_FROM",
                    "ENABLESSL" => "SMTP_ENABLE_SSL",
                    _ => null
                };
                if (alt != null)
                {
                    v = Environment.GetEnvironmentVariable(alt);
                    if (!string.IsNullOrWhiteSpace(v)) return v;
                }

                // 4) Uppercase Email__Smtp__KEY
                v = Environment.GetEnvironmentVariable($"EMAIL__SMTP__{key.ToUpper()}");
                if (!string.IsNullOrWhiteSpace(v)) return v;

                return null;
            }

            var host = GetSetting("Host");
            var portStr = GetSetting("Port");
            var user = GetSetting("User") ?? GetSetting("Username") ?? GetSetting("Account");
            var pass = GetSetting("Password") ?? GetSetting("Pass");
            var enableSslStr = GetSetting("EnableSsl") ?? GetSetting("EnableSSL");
            var fromCfg = GetSetting("From");

            var enableSsl = true;
            if (!string.IsNullOrWhiteSpace(enableSslStr) && bool.TryParse(enableSslStr, out var es)) enableSsl = es;

            var fromAddr = from ?? fromCfg ?? user ?? "no-reply@example.com";

            if (string.IsNullOrWhiteSpace(host))
            {
                var tried = new[] { "Email:Smtp:Host", "Email__Smtp__Host", "SMTP_HOST" };
                var errMsg = $"SMTP Host is not configured. Tried: {string.Join(',', tried)}";
                _logger.LogError(errMsg);
                throw new InvalidOperationException(errMsg);
            }

            if (!int.TryParse(portStr, out var port)) port = 587;

            _logger.LogInformation("SMTP configuration: Host={Host}, Port={Port}, UserSet={HasUser}, From={From}, EnableSsl={EnableSsl}", host, port, !string.IsNullOrWhiteSpace(user), fromAddr, enableSsl);

            using var client = new SmtpClient(host, port)
            {
                DeliveryMethod = SmtpDeliveryMethod.Network,
                EnableSsl = enableSsl,
                UseDefaultCredentials = false,
                Credentials = string.IsNullOrWhiteSpace(user) ? null : new NetworkCredential(user, pass)
            };

            using var msg = new MailMessage(fromAddr, to)
            {
                SubjectEncoding = Encoding.UTF8,
                BodyEncoding = Encoding.UTF8,
                IsBodyHtml = false,
                Subject = subject,
                Body = body
            };

            try
            {
                await client.SendMailAsync(msg);
                _logger.LogInformation("Email successfully sent to {To}", to);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {To}", to);
                throw;
            }
        }
    }
}
