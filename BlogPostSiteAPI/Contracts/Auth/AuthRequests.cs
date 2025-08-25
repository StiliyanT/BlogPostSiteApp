namespace BlogPostSiteAPI.Contracts.Auth;

public record RegisterRequest(string Email, string Password);
public record LoginRequest(string Email, string Password);
public record ConfirmEmailRequest(string UserId, string Token);
public record ResendRequest(string Email);
