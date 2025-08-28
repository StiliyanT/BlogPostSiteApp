using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BlogPostSiteAPI.Models;
using BlogPostSiteAPI.Contracts.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BlogPostSiteAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IConfiguration _config;

        public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, IConfiguration config)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _config = config;
        }

    // Request DTOs moved to Contracts.Auth (top-level) for Swagger schema resolution

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            var user = new ApplicationUser { UserName = req.Email, Email = req.Email };
            var result = await _userManager.CreateAsync(user, req.Password);
            if (!result.Succeeded) return BadRequest(result.Errors);

            // Send confirmation email
            var disableEmail = string.Equals(_config["Email:Disable"], "true", StringComparison.OrdinalIgnoreCase);
            bool sent = false;
            string? error = null;
            if (!disableEmail)
            {
                // Quick pre-check: ensure SMTP host is configured either via config or common env vars
                var host = _config["Email:Smtp:Host"] 
                           ?? Environment.GetEnvironmentVariable("Email__Smtp__Host") 
                           ?? Environment.GetEnvironmentVariable("SMTP_HOST")
                           ?? Environment.GetEnvironmentVariable("EMAIL_SMTP_HOST");
                if (string.IsNullOrWhiteSpace(host))
                {
                    error = "SMTP Host is not configured (Email:Smtp:Host or SMTP_HOST environment variable).";
                }
                else
                {
                    try
                    {
                        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                        var url = BuildConfirmUrl(user.Id, token);
                        var sender = HttpContext.RequestServices.GetRequiredService<BlogPostSiteAPI.Services.IEmailSender>();
                        await sender.SendAsync(user.Email!, "Confirm your email", $"Welcome! Please confirm your account by visiting: {url}");
                        sent = true;
                    }
                    catch (Exception ex)
                    {
                        HttpContext.RequestServices.GetRequiredService<ILogger<AuthController>>()
                            .LogError(ex, "Registration email failed for {Email}", user.Email);
                        error = ex.Message;
                    }
                }
            }
            return Ok(new { requiresEmailConfirmation = true, emailSent = sent, emailError = sent ? null : error });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            var user = await _userManager.FindByEmailAsync(req.Email);
            if (user == null)
            {
                HttpContext.RequestServices.GetRequiredService<ILogger<AuthController>>()
                    .LogInformation("Login failed: user not found for {Email}", req.Email);
                return Unauthorized();
            }

            var pwOk = await _userManager.CheckPasswordAsync(user, req.Password);
            if (!pwOk)
            {
                HttpContext.RequestServices.GetRequiredService<ILogger<AuthController>>()
                    .LogInformation("Login failed: bad password for {Email}", req.Email);
                return Unauthorized();
            }

            if (!user.EmailConfirmed)
            {
                HttpContext.RequestServices.GetRequiredService<ILogger<AuthController>>()
                    .LogInformation("Login failed: email not confirmed for {Email}", req.Email);
                return Unauthorized(new { error = "Email not confirmed" });
            }

            var token = await GenerateJwtAsync(user);
            return Ok(new { token });
        }

        [HttpPost("confirm")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailRequest req)
        {
            var user = await _userManager.FindByIdAsync(req.UserId);
            if (user == null) return BadRequest(new { error = "Invalid user" });
            var result = await _userManager.ConfirmEmailAsync(user, req.Token);
            if (!result.Succeeded) return BadRequest(result.Errors);
            return Ok(new { confirmed = true });
        }

        [HttpPost("resend-confirmation")]
        [AllowAnonymous]
        public async Task<IActionResult> ResendConfirmation([FromBody] ResendRequest req)
        {
            var user = await _userManager.FindByEmailAsync(req.Email);
            if (user == null) return Ok(); // don't reveal existence
            if (user.EmailConfirmed) return Ok();
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var url = BuildConfirmUrl(user.Id, token);
            var sender = HttpContext.RequestServices.GetRequiredService<BlogPostSiteAPI.Services.IEmailSender>();
            await sender.SendAsync(user.Email!, "Confirm your email", $"Confirm your account by visiting: {url}");
            return Ok();
        }

        private string BuildConfirmUrl(string userId, string token)
        {
            var request = HttpContext.Request;
            var origin = $"{request.Scheme}://{request.Host.Value}";
            var encodedToken = System.Net.WebUtility.UrlEncode(token);
            // Frontend route can read userId & token from query and call /api/auth/confirm
            return $"{origin}/confirm?userId={userId}&token={encodedToken}";
        }

    [HttpPost("seed-admin")]
    [AllowAnonymous]
    public async Task<IActionResult> SeedAdmin([FromQuery] bool resetPassword = false)
        {
            // Dev helper to create an admin user if none exists
            const string email = "admin@example.com";
            const string password = "Admin123$";

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                user = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true };
                var create = await _userManager.CreateAsync(user, password);
                if (!create.Succeeded) return BadRequest(create.Errors);
            }
            else if (resetPassword)
            {
                // Dev convenience: reset password if requested
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var reset = await _userManager.ResetPasswordAsync(user, token, password);
                if (!reset.Succeeded) return BadRequest(reset.Errors);
                if (!user.EmailConfirmed)
                {
                    user.EmailConfirmed = true;
                    await _userManager.UpdateAsync(user);
                }
            }

            // Ensure Admin role exists and assign
            var roleMgr = HttpContext.RequestServices.GetRequiredService<RoleManager<IdentityRole>>();
            if (!await roleMgr.RoleExistsAsync("Admin"))
            {
                await roleMgr.CreateAsync(new IdentityRole("Admin"));
            }

            if (!await _userManager.IsInRoleAsync(user, "Admin"))
            {
                await _userManager.AddToRoleAsync(user, "Admin");
            }

            return Ok(new { email, password, resetPasswordApplied = resetPassword });
        }

        private async Task<string> GenerateJwtAsync(ApplicationUser user)
        {
            var jwtSection = _config.GetSection("Jwt");
            var key = jwtSection["Key"] ?? "dev-insecure-key-change-me";
            var issuer = jwtSection["Issuer"] ?? "BlogPostSiteAPI";
            var audience = jwtSection["Audience"] ?? "BlogPostSiteApp";

            if (Encoding.UTF8.GetByteCount(key) < 32)
            {
                throw new InvalidOperationException("JWT key length insufficient (<32 bytes). Configure Jwt:Key with a secure 32+ byte secret.");
            }

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.UserName ?? user.Email ?? string.Empty)
            };

            // roles
            var userRoles = await _userManager.GetRolesAsync(user);
            claims.AddRange(userRoles.Select(r => new Claim(ClaimTypes.Role, r)));

            var creds = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [HttpGet("me")]
        [Authorize]
        public IActionResult Me()
        {
            var name = User.Identity?.Name;
            var sub = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var email = User.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Email)?.Value;
            var roles = User.Claims.Where(c => c.Type == System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToArray();
            return Ok(new { sub, name, email, roles });
        }
    }
}
