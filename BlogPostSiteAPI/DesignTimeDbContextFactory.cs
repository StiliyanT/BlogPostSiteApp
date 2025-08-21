using System;
using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<BlogDbContext>
{
    public BlogDbContext CreateDbContext(string[] args)
    {
        var basePath = Directory.GetCurrentDirectory();
        var cfg = new ConfigurationBuilder()
            .SetBasePath(basePath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            // Pull from user-secrets if available
            .AddUserSecrets<BlogPostSiteAPI.Program>(optional: true)
            .Build();

        string? cs = cfg.GetConnectionString("DefaultConnection");
        cs ??= Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        cs ??= Environment.GetEnvironmentVariable("DATABASE_URL");
        cs ??= Environment.GetEnvironmentVariable("CLEARDB_DATABASE_URL");
        cs ??= Environment.GetEnvironmentVariable("MYSQL_URL");
        cs ??= Environment.GetEnvironmentVariable("JAWSDB_URL");

        if (string.IsNullOrWhiteSpace(cs))
        {
            // Build from Railway split vars if present
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
            throw new InvalidOperationException("No MySQL connection string found for design-time. Set user-secrets or DATABASE_URL.");
        }

        // Convert URL-style to MySQL connection string if needed
        if (cs.StartsWith("mysql://", StringComparison.OrdinalIgnoreCase))
        {
            var uri = new Uri(cs);
            var u = Uri.UnescapeDataString(uri.UserInfo.Split(':')[0]);
            var pw = Uri.UnescapeDataString(uri.UserInfo.Split(':').Length > 1 ? uri.UserInfo.Split(':')[1] : "");
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 3306;
            var db = uri.AbsolutePath.Trim('/');
            cs = $"Server={host};Port={port};Database={db};User={u};Password={pw};SslMode=Required;AllowPublicKeyRetrieval=True;";
        }

        var optionsBuilder = new DbContextOptionsBuilder<BlogDbContext>();
        // Pin a server version to avoid AutoDetect network calls at design time
        var version = new MySqlServerVersion(new Version(8, 0, 36));
        optionsBuilder.UseMySql(cs, version);

        return new BlogDbContext(optionsBuilder.Options);
    }
}
