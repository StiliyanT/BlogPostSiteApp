using BlogPostSiteAPI.Infrastructure.Storage;
using BlogPostSiteAPI.Repositories;
using BlogPostSiteAPI.Startup;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.Identity;
using BlogPostSiteAPI.Models;
using BlogPostSiteAPI.Services;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.HttpOverrides; // for forwarded headers
using Microsoft.AspNetCore.ResponseCompression;
using System.IO.Compression;
using Microsoft.Extensions.Logging; // logging filters

namespace BlogPostSiteAPI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            // Keep Program.cs focused: register services via extensions for clarity
            builder.Services.AddBlogServices(builder);
            var app = builder.Build();



            // Configure middleware and endpoints via extension
            app.UseBlogMiddleware();

            // Apply migrations & optional seeding
            var skipMigrations = string.Equals(Environment.GetEnvironmentVariable("SKIP_MIGRATIONS"), "true", StringComparison.OrdinalIgnoreCase);
            if (skipMigrations)
            {
                app.Logger.LogWarning("SKIP_MIGRATIONS=true - skipping automatic database migrations at startup.");
            }
            else
            {
                // Optional admin seeding via env var
                if (string.Equals(Environment.GetEnvironmentVariable("SEED_ADMIN_ON_STARTUP"), "true", StringComparison.OrdinalIgnoreCase))
                {
                    using var seedScope = app.Services.CreateScope();
                    try
                    {
                        var userMgr = seedScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
                        var roleMgr = seedScope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
                        var adminEmail = Environment.GetEnvironmentVariable("ADMIN_EMAIL") ?? "admin@example.com";
                        var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD") ?? "Admin123$";
                        if (!roleMgr.RoleExistsAsync("Admin").GetAwaiter().GetResult()) roleMgr.CreateAsync(new IdentityRole("Admin")).GetAwaiter().GetResult();
                        var adminUser = userMgr.FindByEmailAsync(adminEmail).GetAwaiter().GetResult();
                        if (adminUser == null)
                        {
                            adminUser = new ApplicationUser { UserName = adminEmail, Email = adminEmail, EmailConfirmed = true };
                            var create = userMgr.CreateAsync(adminUser, adminPassword).GetAwaiter().GetResult();
                            if (!create.Succeeded) app.Logger.LogWarning("Admin seed failed: {Errors}", string.Join(',', create.Errors.Select(e => e.Code)));
                        }
                        if (adminUser != null && !userMgr.IsInRoleAsync(adminUser, "Admin").GetAwaiter().GetResult()) userMgr.AddToRoleAsync(adminUser, "Admin").GetAwaiter().GetResult();
                        app.Logger.LogInformation("Admin seeding completed (user: {Email})", adminEmail);
                    }
                    catch (Exception ex) { app.Logger.LogError(ex, "Admin seeding failed"); }
                }

                using (var scope = app.Services.CreateScope())
                {
                    try
                    {
                        var ctx = scope.ServiceProvider.GetRequiredService<BlogDbContext>();
                        ctx.Database.Migrate();
                        var dbConn = ctx.Database.GetDbConnection();
                        app.Logger.LogInformation("Using DB: {DataSource}/{Database}", dbConn.DataSource, dbConn.Database);
                    }
                    catch (Exception ex) { app.Logger.LogError(ex, "Database migration failed during startup"); }
                }

                if (string.Equals(Environment.GetEnvironmentVariable("SEED_DEFAULT_AUTHOR"), "true", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        using var seedScope2 = app.Services.CreateScope();
                        var ctx2 = seedScope2.ServiceProvider.GetRequiredService<BlogDbContext>();
                        var authorsRepo = seedScope2.ServiceProvider.GetRequiredService<IAuthorsRepository>();
                        var existing = ctx2.Authors.Any();
                        if (!existing)
                        {
                            var defaultAuthor = new Author
                            {
                                Id = Guid.NewGuid(),
                                Name = Environment.GetEnvironmentVariable("DEFAULT_AUTHOR_NAME") ?? "Admin",
                                Slug = (Environment.GetEnvironmentVariable("DEFAULT_AUTHOR_SLUG") ?? "admin").ToLowerInvariant(),
                                Bio = Environment.GetEnvironmentVariable("DEFAULT_AUTHOR_BIO") ?? "Site administrator",
                                Avatar = Environment.GetEnvironmentVariable("DEFAULT_AUTHOR_AVATAR") ?? string.Empty,
                                Email = Environment.GetEnvironmentVariable("DEFAULT_AUTHOR_EMAIL") ?? string.Empty
                            };
                            authorsRepo.CreateAuthorAsync(defaultAuthor).GetAwaiter().GetResult();
                            app.Logger.LogInformation("Seeded default author {Name}", defaultAuthor.Name);
                        }
                    }
                    catch (Exception ex) { app.Logger.LogError(ex, "Default author seeding failed"); }
                }
            }

            app.Run();
        }
    }
}
