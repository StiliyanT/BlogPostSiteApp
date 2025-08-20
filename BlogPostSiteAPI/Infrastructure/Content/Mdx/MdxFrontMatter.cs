using System.Text;
using System.Text.RegularExpressions;

namespace BlogPostSiteAPI.Infrastructure.Content.Mdx
{
    public record FrontMatter(
        string? Title,
        string? Summary,
        DateTime? Date,
        string? Hero,
        string[]? Tags
    );

    public static class MdxFrontMatter
    {
        // Expects MDX starting with '---\n...yaml...\n---'
        public static FrontMatter Parse(string mdx)
        {
            using var reader = new StringReader(mdx);
            var first = reader.ReadLine();
            if (first?.Trim() != "---") return new FrontMatter(null, null, null, null, null);

            var yaml = new StringBuilder();
            string? line;
            while ((line = reader.ReadLine()) != null)
            {
                if (line.Trim() == "---") break;
                yaml.AppendLine(line);
            }

            // Minimal YAML parse without extra packages (match common keys)
            // For production, use YamlDotNet.
            string? title = null, summary = null, hero = null;
            DateTime? date = null;
            var tags = new List<string>();

            foreach (var l in yaml.ToString().Split('\n'))
            {
                var parts = l.Split(':', 2);
                if (parts.Length < 2) continue;
                var key = parts[0].Trim().ToLowerInvariant();
                var val = parts[1].Trim().Trim('"', '\'');
                if (key == "title") title = val;
                else if (key == "summary" || key == "description") summary = val;
                else if (key == "date" && DateTime.TryParse(val, out var d)) date = d;
                else if (key == "hero") hero = val;
                else if (key == "tags")
                {
                    // tags: [a, b] OR "- a" list not handled here
                    var m = Regex.Match(val, @"\[(.*?)\]");
                    if (m.Success)
                        tags = m.Groups[1].Value.Split(',').Select(t => t.Trim().Trim('"', '\'')).Where(t => t.Length > 0).ToList();
                }
            }

            return new FrontMatter(title, summary, date, hero, tags.ToArray());
        }
    }
}
