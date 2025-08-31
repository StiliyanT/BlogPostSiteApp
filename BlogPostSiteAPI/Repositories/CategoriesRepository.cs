using BlogPostSiteAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BlogPostSiteAPI.Repositories
{
    public class CategoriesRepository : ICategoriesRepository
    {
        private readonly BlogDbContext _dbContext;

        public CategoriesRepository(BlogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<Category>> GetAllCategoriesAsync()
        {
            return await _dbContext.Categories.ToListAsync();
        }

        public async Task<Category> GetCategoryByIdAsync(Guid id)
        {
            var category = await _dbContext.Categories.FirstOrDefaultAsync(c => c.Id == id);

            if (category == null)
            {
                return null;
            }
            else
            {
                return category;
            }

        }

        public async Task<Category> CreateCategoryAsync(Category category)
        {
            if (category == null) throw new ArgumentNullException(nameof(category));
            if (category.Id == Guid.Empty) category.Id = Guid.NewGuid();
            // Ensure name is trimmed
            category.Name = (category.Name ?? string.Empty).Trim();

            _dbContext.Categories.Add(category);
            await _dbContext.SaveChangesAsync();

            return category;
        }

        public async Task<bool> CategoryNameExistsAsync(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return false;
            var norm = name.Trim();
            // Perform case-insensitive check in a way EF can translate
            return await _dbContext.Categories.AnyAsync(c => c.Name.ToLower() == norm.ToLower());
        }

        public async Task<bool> DeleteCategoryAsync(Guid id)
        {

            var category = await _dbContext.Categories.FirstOrDefaultAsync(x => x.Id == id);

            if (category == null)
            {
                return false;
            }
            else
            {
                _dbContext.Categories.Remove(category);
                await _dbContext.SaveChangesAsync();

                return true;
            }
        }
    }
}
