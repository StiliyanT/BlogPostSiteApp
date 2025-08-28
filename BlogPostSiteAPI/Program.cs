using BlogPostSiteAPI.Infrastructure.Storage;
using BlogPostSiteAPI.Repositories;
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
                   
            // Add services to the container.

            
            builder.Services.AddControllers().AddJsonOptions(o =>
            {
                // Investigative: relax potential serializer issues
                o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
                o.JsonSerializerOptions.WriteIndented = false;
            });
            builder.Services.Configure<Microsoft.AspNetCore.Mvc.MvcOptions>(opts =>
            {
                opts.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true; // reduce noisy model state errors during debug
            });

            // Response Compression (useful on Azure; enable for HTTPS)
            builder.Services.AddResponseCompression(o =>
            {
                o.EnableForHttps = true;
                o.Providers.Add<GzipCompressionProvider>();
                // (Brotli provider could be added if desired)
            });
            builder.Services.Configure<GzipCompressionProviderOptions>(o =>
            {
                o.Level = CompressionLevel.Fastest; // favor low latency; change to SmallestSize if bandwidth is critical
            });
            builder.Services.AddEndpointsApiExplorer();
            //builder.Services.AddSwaggerGen();
            builder.Services.AddSwaggerGen(c =>
            {
                // Helps if you have duplicate type names in different namespaces
                c.CustomSchemaIds(type => type.FullName);

                // JWT Bearer auth in Swagger UI
                var jwtScheme = new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Enter 'Bearer {token}'"
                };
                c.AddSecurityDefinition("Bearer", jwtScheme);
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
            });
            builder.Services.AddContentStorage(builder.Configuration);

            builder.Services.Configure<FormOptions>(o => {
                o.MultipartBodyLengthLimit = 200_000_000; // 200MB
            });

            // CORS policy (explicit origins). Add your deployed frontend URL(s) via ALLOWED_ORIGINS env var or config.
            const string cors = "_cors";
            builder.Services.AddCors(o => o.AddPolicy(cors, p =>
            {
                // Collect explicit origins: default local dev ports + configured + env var
                var configured = (builder.Configuration["AllowedOrigins"] ?? Environment.GetEnvironmentVariable("ALLOWED_ORIGINS") ?? "").
                    Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
                configured.AddRange(new[] { "http://localhost:5173", "https://localhost:5173", "http://localhost:3000", "https://localhost:3000" });
                // Distinct
                var origins = configured.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
                if (origins.Length > 0)
                {
                    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("Location");
                }
                else
                {
                    p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod(); // fallback (dev only)
                }
            }));

            // Database: simple MySQL registration using configured connection string (App Service / user-secrets / appsettings).
            builder.Services.AddDbContext<BlogDbContext>(opt =>
            {
                var conn =
                    builder.Configuration.GetConnectionString("DefaultConnection")
                    ?? builder.Configuration["ConnectionStrings:DefaultConnection"]
                    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
                    ?? Environment.GetEnvironmentVariable("MYSQLCONNSTR_DefaultConnection")
                    ?? Environment.GetEnvironmentVariable("CUSTOMCONNSTR_DefaultConnection")
                    ?? throw new InvalidOperationException("Missing connection string 'DefaultConnection'.");

                // Azure App Service also exposes connection strings as e.g. MYSQLCONNSTR_<Name>
                if (string.IsNullOrWhiteSpace(conn))
                {
                    foreach (System.Collections.DictionaryEntry kv in Environment.GetEnvironmentVariables())
                    {
                        var k = kv.Key?.ToString();
                        if (k != null && k.StartsWith("MYSQLCONNSTR_", StringComparison.OrdinalIgnoreCase))
                        {
                            conn = kv.Value?.ToString();
                            break;
                        }
                    }
                }

                if (string.IsNullOrWhiteSpace(conn))
                {
                    throw new InvalidOperationException("Missing connection string 'DefaultConnection'. Set it in appsettings or App Service Configuration.");
                }

                // Log minimal DB info (no secrets)
                try
                {
                    var parts = conn.Split(';', StringSplitOptions.RemoveEmptyEntries);
                    var safe = parts.Where(p => p.StartsWith("Server=", StringComparison.OrdinalIgnoreCase) ||
                                                p.StartsWith("Host=", StringComparison.OrdinalIgnoreCase) ||
                                                p.StartsWith("Database=", StringComparison.OrdinalIgnoreCase) ||
                                                p.StartsWith("Port=", StringComparison.OrdinalIgnoreCase));
                    Console.WriteLine("[Startup] Using MySQL connection parts: " + string.Join(';', safe));
                }
                catch { }

                // Allow pinning server version to avoid AutoDetect blocking startup
                var pinnedVersion = Environment.GetEnvironmentVariable("DB_SERVER_VERSION"); // e.g. 8.0.36
                ServerVersion serverVersion;
                if (!string.IsNullOrWhiteSpace(pinnedVersion) && Version.TryParse(pinnedVersion, out var ver))
                {
                    serverVersion = new MySqlServerVersion(ver);
                    Console.WriteLine($"[Startup] Using pinned MySQL server version {ver}");
                }
                else
                {
                    try
                    {
                        serverVersion = ServerVersion.AutoDetect(conn);
                        Console.WriteLine($"[Startup] AutoDetected MySQL server version: {serverVersion}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Startup] ServerVersion.AutoDetect failed: {ex.Message}. Falling back to 8.0.36. Set DB_SERVER_VERSION to override.");
                        serverVersion = new MySqlServerVersion(new Version(8, 0, 36));
                    }
                }

                // IMPORTANT: use detected/pinned serverVersion (was previously ignored in favor of a hard-coded version)
                opt.UseMySql(conn, serverVersion, mysql =>
                {
                    mysql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
                });
            });
            // Increase EF Core command logging to surface SQL / potential table-not-found errors (Information level)
            builder.Logging.AddFilter("Microsoft.EntityFrameworkCore.Database.Command", LogLevel.Information);

            builder.Services
                .AddIdentityCore<ApplicationUser>(o =>
                {
                    o.User.RequireUniqueEmail = true;
                })
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<BlogDbContext>()
                .AddSignInManager()
                .AddDefaultTokenProviders();

            var jwtSection = builder.Configuration.GetSection("Jwt");
                var jwtKey = jwtSection["Key"] ?? Environment.GetEnvironmentVariable("Jwt__Key") ?? "dev-insecure-key-change-me-0123456789abcdef0123456789"; // >=32 chars
            if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
            {
                throw new InvalidOperationException("JWT signing key too short. Provide a key at least 32 bytes (256 bits) for HS256 via configuration key Jwt:Key or env var Jwt__Key.");
            }
            var jwtIssuer = jwtSection["Issuer"] ?? "BlogPostSiteAPI";
            var jwtAudience = jwtSection["Audience"] ?? "BlogPostSiteApp";

            builder.Services
                .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = jwtIssuer,
                        ValidAudience = jwtAudience,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                    };
                });

            builder.Services.AddAuthorization(options =>
            {
                options.AddPolicy("Admin", policy => policy.RequireRole("Admin"));
            });

            // Minimal per-IP rate limiting (e.g., 3 requests per 60 seconds burst 5)
            builder.Services.AddRateLimiter(options =>
            {
                options.AddPolicy("contact", httpContext =>
                {
                    var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                    return RateLimitPartition.GetFixedWindowLimiter(ip, key => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 3,
                        Window = TimeSpan.FromSeconds(60),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
                });
            });

            builder.Services.AddScoped<ICategoriesRepository, CategoriesRepository>();
            builder.Services.AddScoped<IAuthorsRepository, AuthorsRepository>();
            builder.Services.AddScoped<IBlogContentStorage, LocalBlogContentStorage>();
            builder.Services.AddScoped<IBlogPostsRepository, BlogPostsRepository>();
            builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();

            var app = builder.Build();



            // Configure the HTTP request pipeline.
            var swaggerEnabled = app.Environment.IsDevelopment() || string.Equals(Environment.GetEnvironmentVariable("SWAGGER_ENABLED"), "true", StringComparison.OrdinalIgnoreCase);
            if (swaggerEnabled)
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // Lightweight diagnostics middleware (enable by setting DETAILED_ERRORS=true)
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
                        // Always surface minimal message via header to aid prod diagnostics (shortened & sanitized)
                        var msg = (ex.Message ?? "").Replace('\n',' ').Replace('\r',' ');
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

            var skipMigrations = string.Equals(Environment.GetEnvironmentVariable("SKIP_MIGRATIONS"), "true", StringComparison.OrdinalIgnoreCase);
            if (skipMigrations)
            {
                app.Logger.LogWarning("SKIP_MIGRATIONS=true - skipping automatic database migrations at startup.");
            }
            else
            {
            // Optional admin seeding via environment variable SEED_ADMIN_ON_STARTUP=true
            if (string.Equals(Environment.GetEnvironmentVariable("SEED_ADMIN_ON_STARTUP"), "true", StringComparison.OrdinalIgnoreCase))
            {
                using var seedScope = app.Services.CreateScope();
                try
                {
                    var userMgr = seedScope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
                    var roleMgr = seedScope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
                    var adminEmail = Environment.GetEnvironmentVariable("ADMIN_EMAIL") ?? "admin@example.com";
                    var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD") ?? "Admin123$"; // ensure meets Identity password policy
                    if (!roleMgr.RoleExistsAsync("Admin").GetAwaiter().GetResult())
                        roleMgr.CreateAsync(new IdentityRole("Admin")).GetAwaiter().GetResult();
                    var adminUser = userMgr.FindByEmailAsync(adminEmail).GetAwaiter().GetResult();
                    if (adminUser == null)
                    {
                        adminUser = new ApplicationUser { UserName = adminEmail, Email = adminEmail, EmailConfirmed = true };
                        var create = userMgr.CreateAsync(adminUser, adminPassword).GetAwaiter().GetResult();
                        if (!create.Succeeded)
                        {
                            app.Logger.LogWarning("Admin seed failed: {Errors}", string.Join(',', create.Errors.Select(e => e.Code)));
                        }
                    }
                    if (adminUser != null && !userMgr.IsInRoleAsync(adminUser, "Admin").GetAwaiter().GetResult())
                    {
                        userMgr.AddToRoleAsync(adminUser, "Admin").GetAwaiter().GetResult();
                    }
                    app.Logger.LogInformation("Admin seeding completed (user: {Email})", adminEmail);
                }
                catch (Exception ex)
                {
                    app.Logger.LogError(ex, "Admin seeding failed");
                }
            }
                // Apply EF migrations on boot (auto-migrate)
                using (var scope = app.Services.CreateScope())
                {
                    try
                    {
                        var ctx = scope.ServiceProvider.GetRequiredService<BlogDbContext>();
                        ctx.Database.Migrate();
                        var dbConn = ctx.Database.GetDbConnection();
                        app.Logger.LogInformation("Using DB: {DataSource}/{Database}", dbConn.DataSource, dbConn.Database);
                    }
                    catch (Exception ex)
                    {
                        app.Logger.LogError(ex, "Database migration failed during startup");
                    }
                }
            }

            // Reordered middleware: compression & forwarded headers early, then routing -> CORS -> auth
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

            app.UseCors(cors);

            try { app.UseContentStorageStaticFiles(); }
            catch (Exception ex) { app.Logger.LogError(ex, "Failed to configure content storage static files"); }

            app.UseHttpsRedirection();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseRateLimiter();

            // Health & root endpoints
            app.MapGet("/health", () => Results.Ok("OK"));
            app.MapGet("/", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

            // Diagnostics endpoint to help debug 500s (REMOVE or secure once issue resolved)
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
                        cmd.CommandText = "SHOW TABLES"; // MySQL specific
                        using var reader = await cmd.ExecuteReaderAsync();
                        while (await reader.ReadAsync())
                        {
                            tables.Add(reader.GetString(0));
                        }
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
                try
                {
                    await ctx.Database.ExecuteSqlRawAsync("SELECT 1");
                    return Results.Ok("Database reachable");
                }
                catch (Exception ex)
                {
                    return Results.Json(new { error = ex.Message, stack = ex.StackTrace });
                }
            });

            // Diagnostic: attempt to enumerate blog posts to expose actual exception
            app.MapGet("/diag/posts", async (IBlogPostsRepository repo) =>
            {
                try
                {
                    var posts = await repo.GetAllBlogPostsAsync();
                    var slim = posts.Select(p => new { p.Id, p.Slug, p.Title }).ToList();
                    return Results.Json(new { count = slim.Count, posts = slim });
                }
                catch (Exception ex)
                {
                    return Results.Json(new { error = ex.Message, stack = ex.StackTrace });
                }
            });

            // Diagnostic: report SMTP-related configuration/env vars present in the running process
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

                    string? detected = cfgHost ?? env1 ?? env2 ?? env3 ?? env4;

                    string? masked = null;
                    if (!string.IsNullOrWhiteSpace(detected))
                    {
                        var v = detected!;
                        masked = v.Length <= 6 ? "***" : v.Substring(0, 3) + "***" + v.Substring(v.Length - 3);
                    }

                    var dict = new Dictionary<string, object?>()
                    {
                        ["configured"] = !string.IsNullOrWhiteSpace(cfgHost),
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

            // Test endpoint to verify JSON body writing pipeline (remove after diagnosing)
            app.MapGet("/diag/test", () => Results.Json(new[]{ "ok", DateTime.UtcNow.ToString("O") }));

            app.MapControllers();

            if (!app.Environment.IsDevelopment())
            {
                app.UseHsts();
            }

            app.Run();
        }
    }
}
