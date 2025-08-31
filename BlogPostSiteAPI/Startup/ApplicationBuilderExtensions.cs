using BlogPostSiteAPI.Repositories;
using Microsoft.EntityFrameworkCore;
using BlogPostSiteAPI.Models;
using BlogPostSiteAPI.Infrastructure.Storage;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.HttpOverrides;
using System.Text.Json;

namespace BlogPostSiteAPI.Startup
{
    public static class ApplicationBuilderExtensions
    {
        public static WebApplication UseBlogMiddleware(this WebApplication app)
        {
            var swaggerEnabled = app.Environment.IsDevelopment() || string.Equals(Environment.GetEnvironmentVariable("SWAGGER_ENABLED"), "true", StringComparison.OrdinalIgnoreCase);
            if (swaggerEnabled)
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            var detailedErrors = string.Equals(Environment.GetEnvironmentVariable("DETAILED_ERRORS"), "true", StringComparison.OrdinalIgnoreCase);
            if (detailedErrors && app.Environment.IsProduction())
            {
                app.Logger.LogWarning("DETAILED_ERRORS=true - exposing stack traces in responses. Disable in production once debugging is finished.");
            }

            app.Use(async (ctx, next) =>
            {
                try
                {
                    await next();
                }
                catch (Exception ex)
                {
                    app.Logger.LogError(ex, "Unhandled exception processing {Path}", ctx.Request.Path);
                    if (!ctx.Response.HasStarted)
                    {
                        ctx.Response.Clear();
                        ctx.Response.StatusCode = 500;
                        ctx.Response.ContentType = "application/json";
                        var msg = (ex.Message ?? "").Replace('\n', ' ').Replace('\r', ' ');
                        if (msg.Length > 180) msg = msg.Substring(0, 180);
                        ctx.Response.Headers["X-Error-Message"] = msg;
                        if (detailedErrors)
                        {
                            await ctx.Response.WriteAsJsonAsync(new { error = ex.Message, stack = ex.StackTrace });
                        }
                        else
                        {
                            await ctx.Response.WriteAsJsonAsync(new { error = "Internal Server Error" });
                        }
                    }
                }
            });

            app.UseForwardedHeaders(new ForwardedHeadersOptions
            {
                ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
            });

            app.UseResponseCompression();

            app.Use(async (ctx, next) =>
            {
                var sw = System.Diagnostics.Stopwatch.StartNew();
                app.Logger.LogInformation("[TRACE] -> {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
                try
                {
                    await next();
                    app.Logger.LogInformation("[TRACE] <- {Status} {Method} {Path} {Elapsed}ms", ctx.Response.StatusCode, ctx.Request.Method, ctx.Request.Path, sw.ElapsedMilliseconds);
                }
                catch (Exception ex)
                {
                    app.Logger.LogError(ex, "[TRACE] EX {Method} {Path} {Elapsed}ms", ctx.Request.Method, ctx.Request.Path, sw.ElapsedMilliseconds);
                    throw;
                }
            });

            app.UseRouting();

            app.UseCors("_cors");

            try { app.UseContentStorageStaticFiles(); }
            catch (Exception ex) { app.Logger.LogError(ex, "Failed to configure content storage static files"); }

            app.UseHttpsRedirection();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseRateLimiter();

            app.MapGet("/health", () => Results.Ok("OK"));
            app.MapGet("/", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

            app.MapGet("/diag/db", async (BlogDbContext ctx) =>
            {
                try
                {
                    var pending = await ctx.Database.GetPendingMigrationsAsync();
                    var applied = await ctx.Database.GetAppliedMigrationsAsync();
                    var canConnect = await ctx.Database.CanConnectAsync();
                    var tables = new List<string>();
                    try
                    {
                        var conn = ctx.Database.GetDbConnection();
                        await conn.OpenAsync();
                        using var cmd = conn.CreateCommand();
                        cmd.CommandText = "SHOW TABLES";
                        using var reader = await cmd.ExecuteReaderAsync();
                        while (await reader.ReadAsync()) tables.Add(reader.GetString(0));
                    }
                    catch (Exception exInner)
                    {
                        return Results.Json(new { canConnect, pending, applied, error = exInner.Message });
                    }
                    return Results.Json(new { canConnect, pending, applied, tables });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { error = ex.Message, stack = ex.StackTrace });
                }
            });

            app.MapGet("/diag/pingdb", async (BlogDbContext ctx) =>
            {
                try { await ctx.Database.ExecuteSqlRawAsync("SELECT 1"); return Results.Ok("Database reachable"); }
                catch (Exception ex) { return Results.Json(new { error = ex.Message, stack = ex.StackTrace }); }
            });

            app.MapGet("/diag/posts", async (IBlogPostsRepository repo) =>
            {
                try
                {
                    var posts = await repo.GetAllBlogPostsAsync();
                    var slim = posts.Select(p => new { p.Id, p.Slug, p.Title }).ToList();
                    return Results.Json(new { count = slim.Count, posts = slim });
                }
                catch (Exception ex) { return Results.Json(new { error = ex.Message, stack = ex.StackTrace }); }
            });

            app.MapGet("/diag/smtp", (HttpContext http) =>
            {
                try
                {
                    var cfg = app.Services.GetService<IConfiguration>();
                    string? cfgHost = cfg?["Email:Smtp:Host"];
                    string? env1 = Environment.GetEnvironmentVariable("Email__Smtp__Host");
                    string? env2 = Environment.GetEnvironmentVariable("EMAIL__SMTP__HOST");
                    string? env3 = Environment.GetEnvironmentVariable("EMAIL_SMTP_HOST");
                    string? env4 = Environment.GetEnvironmentVariable("SMTP_HOST");

                    string? Clean(string? s)
                    {
                        if (string.IsNullOrWhiteSpace(s)) return null;
                        s = s.Trim();
                        if ((s.Length >= 2 && ((s.StartsWith('"') && s.EndsWith('"')) || (s.StartsWith('\'') && s.EndsWith('\''))))) s = s.Substring(1, s.Length - 2).Trim();
                        s = s.Replace("\r", "").Replace("\n", "").Trim();
                        return string.IsNullOrWhiteSpace(s) ? null : s;
                    }

                    var cleanedCfg = Clean(cfgHost);
                    var cleanedEnv1 = Clean(env1);
                    var cleanedEnv2 = Clean(env2);
                    var cleanedEnv3 = Clean(env3);
                    var cleanedEnv4 = Clean(env4);

                    string? detected = cleanedCfg ?? cleanedEnv1 ?? cleanedEnv2 ?? cleanedEnv3 ?? cleanedEnv4;
                    string? masked = null;
                    if (!string.IsNullOrWhiteSpace(detected)) { var v = detected!; masked = v.Length <= 6 ? "***" : v.Substring(0, 3) + "***" + v.Substring(v.Length - 3); }

                    var dict = new Dictionary<string, object?>()
                    {
                        ["configured"] = !string.IsNullOrWhiteSpace(cleanedCfg),
                        ["env_Email__Smtp__Host"] = !string.IsNullOrWhiteSpace(env1),
                        ["env_EMAIL__SMTP__HOST"] = !string.IsNullOrWhiteSpace(env2),
                        ["env_EMAIL_SMTP_HOST"] = !string.IsNullOrWhiteSpace(env3),
                        ["env_SMTP_HOST"] = !string.IsNullOrWhiteSpace(env4),
                        ["env_Email__Smtp__Host_len"] = env1?.Length ?? 0,
                        ["env_EMAIL__SMTP__HOST_len"] = env2?.Length ?? 0,
                        ["env_EMAIL_SMTP_HOST_len"] = env3?.Length ?? 0,
                        ["env_SMTP_HOST_len"] = env4?.Length ?? 0,
                        ["detected"] = masked,
                        ["detected_len"] = detected?.Length ?? 0
                    };

                    return Results.Json(dict);
                }
                catch (Exception ex)
                {
                    app.Logger.LogError(ex, "/diag/smtp handler failed");
                    return Results.Json(new { error = ex.Message });
                }
            });

            app.MapGet("/diag/test", () => Results.Json(new[] { "ok", DateTime.UtcNow.ToString("O") }));

            app.MapControllers();

            if (!app.Environment.IsDevelopment()) app.UseHsts();

            return app;
        }
    }
}
