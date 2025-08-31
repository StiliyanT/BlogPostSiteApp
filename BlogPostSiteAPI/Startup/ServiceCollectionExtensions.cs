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
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;
using System.IO.Compression;
using Microsoft.Extensions.Logging;

namespace BlogPostSiteAPI.Startup
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddBlogServices(this IServiceCollection services, WebApplicationBuilder builder)
        {
            var configuration = builder.Configuration;

            services.AddControllers().AddJsonOptions(o =>
            {
                o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
                o.JsonSerializerOptions.WriteIndented = false;
            });

            services.Configure<Microsoft.AspNetCore.Mvc.MvcOptions>(opts =>
            {
                opts.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
            });

            services.AddResponseCompression(o =>
            {
                o.EnableForHttps = true;
                o.Providers.Add<GzipCompressionProvider>();
            });
            services.Configure<GzipCompressionProviderOptions>(o => { o.Level = CompressionLevel.Fastest; });

            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen(c =>
            {
                c.CustomSchemaIds(type => type.FullName);
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

            services.AddContentStorage(configuration);

            services.Configure<FormOptions>(o => { o.MultipartBodyLengthLimit = 200_000_000; });

            const string cors = "_cors";
            services.AddCors(o => o.AddPolicy(cors, p =>
            {
                var configured = (configuration["AllowedOrigins"] ?? Environment.GetEnvironmentVariable("ALLOWED_ORIGINS") ?? "")
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
                configured.AddRange(new[] { "http://localhost:5173", "https://localhost:5173", "http://localhost:3000", "https://localhost:3000" });
                var origins = configured.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
                if (origins.Length > 0)
                    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("Location");
                else
                    p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
            }));

            // Database registration
            services.AddDbContext<BlogDbContext>(opt =>
            {
                var conn =
                    configuration.GetConnectionString("DefaultConnection")
                    ?? configuration["ConnectionStrings:DefaultConnection"]
                    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
                    ?? Environment.GetEnvironmentVariable("MYSQLCONNSTR_DefaultConnection")
                    ?? Environment.GetEnvironmentVariable("CUSTOMCONNSTR_DefaultConnection");

                if (string.IsNullOrWhiteSpace(conn)) throw new InvalidOperationException("Missing connection string 'DefaultConnection'.");

                try
                {
                    var parts = conn.Split(';', StringSplitOptions.RemoveEmptyEntries);
                    var safe = parts.Where(p => p.StartsWith("Server=", StringComparison.OrdinalIgnoreCase) || p.StartsWith("Host=", StringComparison.OrdinalIgnoreCase) || p.StartsWith("Database=", StringComparison.OrdinalIgnoreCase) || p.StartsWith("Port=", StringComparison.OrdinalIgnoreCase));
                    Console.WriteLine("[Startup] Using MySQL connection parts: " + string.Join(';', safe));
                }
                catch { }

                var pinnedVersion = Environment.GetEnvironmentVariable("DB_SERVER_VERSION");
                ServerVersion serverVersion;
                if (!string.IsNullOrWhiteSpace(pinnedVersion) && Version.TryParse(pinnedVersion, out var ver))
                {
                    serverVersion = new MySqlServerVersion(ver);
                    Console.WriteLine($"[Startup] Using pinned MySQL server version {ver}");
                }
                else
                {
                    try { serverVersion = ServerVersion.AutoDetect(conn); Console.WriteLine($"[Startup] AutoDetected MySQL server version: {serverVersion}"); }
                    catch { serverVersion = new MySqlServerVersion(new Version(8, 0, 36)); }
                }

                opt.UseMySql(conn, serverVersion, mysql => { mysql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null); });
            });

            builder.Logging.AddFilter("Microsoft.EntityFrameworkCore.Database.Command", LogLevel.Information);

            services
                .AddIdentityCore<ApplicationUser>(o => { o.User.RequireUniqueEmail = true; })
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<BlogDbContext>()
                .AddSignInManager()
                .AddDefaultTokenProviders();

            var jwtSection = configuration.GetSection("Jwt");
            var jwtKey = jwtSection["Key"] ?? Environment.GetEnvironmentVariable("Jwt__Key") ?? "dev-insecure-key-change-me-0123456789abcdef0123456789";
            if (Encoding.UTF8.GetByteCount(jwtKey) < 32) throw new InvalidOperationException("JWT signing key too short.");
            var jwtIssuer = jwtSection["Issuer"] ?? "BlogPostSiteAPI";
            var jwtAudience = jwtSection["Audience"] ?? "BlogPostSiteApp";

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
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

            services.AddAuthorization(options => { options.AddPolicy("Admin", policy => policy.RequireRole("Admin")); });

            services.AddRateLimiter(options =>
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

            // App services
            services.AddScoped<ICategoriesRepository, CategoriesRepository>();
            services.AddScoped<IAuthorsRepository, AuthorsRepository>();
            services.AddScoped<IBlogContentStorage, LocalBlogContentStorage>();
            services.AddScoped<IBlogPostsRepository, BlogPostsRepository>();
            services.AddScoped<IEmailSender, SmtpEmailSender>();

            return services;
        }
    }
}
