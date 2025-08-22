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

namespace BlogPostSiteAPI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
                   
            // Add services to the container.

            
            builder.Services.AddControllers();

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
            //builder.Services.AddContentStorage(builder.Configuration);

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

                opt.UseMySql(conn, new MySqlServerVersion(new Version(8, 0, 36)), mysql =>
                {
                    mysql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
                });
            });

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
            var jwtKey = jwtSection["Key"] ?? "dev-insecure-key-change-me-0123456789abcdef0123456789";
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

            var skipMigrations = string.Equals(Environment.GetEnvironmentVariable("SKIP_MIGRATIONS"), "true", StringComparison.OrdinalIgnoreCase);
            if (skipMigrations)
            {
                app.Logger.LogWarning("SKIP_MIGRATIONS=true - skipping automatic database migrations at startup.");
            }
            else
            {
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

            app.UseRouting();

            app.UseCors(cors);

            //app.UseContentStorageStaticFiles(); // <- serves /static/** from RootPhysicalPath

            app.UseHttpsRedirection();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseRateLimiter();

            // Health & root endpoints
            app.MapGet("/health", () => Results.Ok("OK"));
            app.MapGet("/", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

            app.MapControllers();

            // Azure App Service supplies its own port; manual binding removed.

            // Forwarded headers (behind reverse proxy / load balancer)
            app.UseForwardedHeaders(new ForwardedHeadersOptions
            {
                ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
            });

            app.UseResponseCompression();

            if (!app.Environment.IsDevelopment())
            {
                app.UseHsts();
            }

            app.Run();
        }
    }
}
