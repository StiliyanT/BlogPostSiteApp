using BlogPostSiteAPI.Services;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.RateLimiting;

namespace BlogPostSiteAPI.Controllers
{
    public sealed class ContactMessageDto
    {
        [Required]
    [StringLength(120)]
        public string Name { get; set; } = string.Empty;
        [Required, EmailAddress]
    [StringLength(254)]
        public string Email { get; set; } = string.Empty;
        [Required]
    [StringLength(200)]
        public string Subject { get; set; } = string.Empty;
        [Required]
    [StringLength(5000, MinimumLength = 1)]
        public string Message { get; set; } = string.Empty;

    // Optional anti-abuse signals from the client
    public string? Honeypot { get; set; }
    [Range(0, 1_800_000)] // 30 minutes max
    public int? ElapsedMs { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public sealed class ContactController : ControllerBase
    {
        private readonly IEmailSender _email;
        private readonly ILogger<ContactController> _logger;
        private readonly IHostEnvironment _env;

        public ContactController(IEmailSender email, ILogger<ContactController> logger, IHostEnvironment env)
        {
            _email = email;
            _logger = logger;
            _env = env;
        }

        private static bool ContainsHeaderBreakingChars(string s)
        {
            foreach (var ch in s)
            {
                if (ch == '\r' || ch == '\n' || ch == '\0') return true;
            }
            return false;
        }

        private IActionResult GenericBadRequest()
            => BadRequest(new { error = "Failed to send message" });

        [HttpPost]
        [EnableRateLimiting("contact")] // applies per-IP limiter configured in Program.cs
        public async Task<IActionResult> Send([FromBody] ContactMessageDto dto)
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            // Normalize
            var name = (dto.Name ?? string.Empty).Trim();
            var email = (dto.Email ?? string.Empty).Trim();
            var subjectRaw = (dto.Subject ?? string.Empty).Trim();
            var message = (dto.Message ?? string.Empty).Trim();

            // Honeypot: if filled, act as success but drop the message (don‘t tip off bots)
            if (!string.IsNullOrWhiteSpace(dto.Honeypot))
            {
                _logger.LogInformation("Contact honeypot triggered from IP {IP}", HttpContext.Connection.RemoteIpAddress?.ToString());
                return NoContent();
            }

            // Basic timing heuristic: require some minimum human time and cap extremes
            if (dto.ElapsedMs.HasValue)
            {
                var elapsed = dto.ElapsedMs.Value;
                const int minElapsedMs = 800;      // ~0.8s minimum to type
                const int maxElapsedMs = 1_800_000; // 30 minutes
                if (elapsed < minElapsedMs || elapsed > maxElapsedMs)
                {
                    _logger.LogWarning("Contact timing check failed: {Elapsed}ms from IP {IP}", elapsed, HttpContext.Connection.RemoteIpAddress?.ToString());
                    return GenericBadRequest();
                }
            }

            // Header injection guards on fields used in headers
            if (ContainsHeaderBreakingChars(name) || ContainsHeaderBreakingChars(subjectRaw) || ContainsHeaderBreakingChars(email))
            {
                _logger.LogWarning("Contact header injection attempt detected from IP {IP}", HttpContext.Connection.RemoteIpAddress?.ToString());
                return GenericBadRequest();
            }

            // Final subject and body
            var subject = $"[Email Sender from BlogPostSite: {name}] {subjectRaw}";
            // Keep the user's email only in body (no headers altered with user input)
            var body = $"From: {name} <{email}>\n\n{message}";

            var to = "stiliyantopalov@gmail.com";

            try
            {
                await _email.SendAsync(to, subject, body);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send contact message from {Email}", dto.Email);
                if (_env.IsDevelopment())
                {
                    return StatusCode(500, new { error = "Failed to send message", detail = ex.Message });
                }
                return StatusCode(500, new { error = "Failed to send message" });
            }
        }
    }
}
