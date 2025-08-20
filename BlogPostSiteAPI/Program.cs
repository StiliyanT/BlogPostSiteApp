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

namespace BlogPostSiteAPI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
                   
            // Add services to the container.

            
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            //builder.Services.AddSwaggerGen();
            builder.Services.AddSwaggerGen(c =>
            {
                // Helps if you have duplicate type names in different namespaces
                c.CustomSchemaIds(type => type.FullName);
            });
            builder.Services.AddContentStorage(builder.Configuration);

            builder.Services.Configure<FormOptions>(o => {
                o.MultipartBodyLengthLimit = 200_000_000; // 200MB
            });

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("vite", policy => policy
                    // Allow any localhost port in dev to avoid CORS breakage when Vite picks a free port
                    .SetIsOriginAllowed(origin =>
                    {
                        try
                        {
                            var uri = new Uri(origin);
                            return uri.IsLoopback; // http(s)://localhost or 127.0.0.1
                        }
                        catch { return false; }
                    })
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .WithExposedHeaders("Location")
                );
            });

            builder.Services.AddDbContext<BlogDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            // Apply EF migrations (dev convenience) and log DB info
            try
            {
                using var scope = app.Services.CreateScope();
                var ctx = scope.ServiceProvider.GetRequiredService<BlogDbContext>();
                // Ensure database schema is up to date (creates Identity tables, etc.)
                ctx.Database.Migrate();
                var conn = ctx.Database.GetDbConnection();
                app.Logger.LogInformation("Using DB: {DataSource}/{Database}", conn.DataSource, conn.Database);
                var postsCount = ctx.BlogPosts.Count();
                app.Logger.LogInformation("BlogPosts rows: {Count}", postsCount);
            }
            catch (Exception ex)
            {
                app.Logger.LogWarning(ex, "Failed to run startup DB diagnostics");
            }

            app.UseRouting();

            app.UseCors("vite");

            app.UseContentStorageStaticFiles(); // <- serves /static/** from RootPhysicalPath

            app.UseHttpsRedirection();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseRateLimiter();


            app.MapControllers();

            app.Run();
        }
    }
}
