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

            // Database: MySQL (Pomelo). Supports Railway via env var DATABASE_URL or connection string in config.
            builder.Services.AddDbContext<BlogDbContext>(opt =>
            {
                var cfg = builder.Configuration;
                // Prefer explicit DefaultConnection from settings
                var cs = cfg.GetConnectionString("DefaultConnection");
                // Support user-secrets/env var style key (ConnectionStrings__DefaultConnection)
                cs ??= Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
                // Fallbacks: common Railway/Heroku style envs
                cs ??= Environment.GetEnvironmentVariable("DATABASE_URL");
                cs ??= Environment.GetEnvironmentVariable("CLEARDB_DATABASE_URL");
                cs ??= Environment.GetEnvironmentVariable("MYSQL_URL");
                cs ??= Environment.GetEnvironmentVariable("JAWSDB_URL");
                // Build from individual MYSQL* vars (Railway)
                if (string.IsNullOrWhiteSpace(cs))
                {
                    var host = Environment.GetEnvironmentVariable("MYSQLHOST");
                    var db = Environment.GetEnvironmentVariable("MYSQLDATABASE");
                    var user = Environment.GetEnvironmentVariable("MYSQLUSER");
                    var pass = Environment.GetEnvironmentVariable("MYSQLPASSWORD");
                    var portStr = Environment.GetEnvironmentVariable("MYSQLPORT");
                    if (!string.IsNullOrWhiteSpace(host) && !string.IsNullOrWhiteSpace(db) && !string.IsNullOrWhiteSpace(user))
                    {
                        var port = int.TryParse(portStr, out var p) ? p : 3306;
                        cs = $"Server={host};Port={port};Database={db};User={user};Password={pass};SslMode=Required;AllowPublicKeyRetrieval=True;";
                    }
                }

                if (string.IsNullOrWhiteSpace(cs))
                {
                    throw new InvalidOperationException("No MySQL connection string found. Set ConnectionStrings:DefaultConnection or DATABASE_URL.");
                }

                // If URL style (e.g., mysql://user:pass@host:port/db), convert to MySQL connection string
                if (cs.StartsWith("mysql://", StringComparison.OrdinalIgnoreCase))
                {
                    var uri = new Uri(cs);
                    var user = Uri.UnescapeDataString(uri.UserInfo.Split(':')[0]);
                    var pass = Uri.UnescapeDataString(uri.UserInfo.Split(':').ElementAtOrDefault(1) ?? "");
                    var host = uri.Host;
                    var port = uri.Port > 0 ? uri.Port : 3306;
                    var db = uri.AbsolutePath.Trim('/');
                    cs = $"Server={host};Port={port};Database={db};User={user};Password={pass};SslMode=Required;AllowPublicKeyRetrieval=True;";
                }

                // Detect server version if possible; fallback to a pinned version for design-time (dotnet ef)
                var serverVersion = (ServerVersion?)null;
                try
                {
                    serverVersion = ServerVersion.AutoDetect(cs);
                }
                catch
                {
                    serverVersion = new MySqlServerVersion(new Version(8, 0, 36));
                }

                opt.UseMySql(cs, serverVersion, mysql =>
                {
                    // Retry transient failures (e.g., cold start, brief network blips)
                    mysql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
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

            // Apply EF migrations on boot (auto-migrate)
            using (var scope = app.Services.CreateScope())
            {
                try
                {
                    var ctx = scope.ServiceProvider.GetRequiredService<BlogDbContext>();
                    ctx.Database.Migrate();
                    var conn = ctx.Database.GetDbConnection();
                    app.Logger.LogInformation("Using DB: {DataSource}/{Database}", conn.DataSource, conn.Database);
                }
                catch (Exception ex)
                {
                    app.Logger.LogError(ex, "Database migration failed during startup");
                }
            }

            app.UseRouting();

            app.UseCors(cors);

            app.UseContentStorageStaticFiles(); // <- serves /static/** from RootPhysicalPath

            app.UseHttpsRedirection();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseRateLimiter();

            // Health endpoint for platform checks (idempotent, re-map safe)
            app.MapGet("/health", () => Results.Ok("OK"));

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
