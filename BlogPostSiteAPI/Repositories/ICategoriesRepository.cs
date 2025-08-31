using BlogPostSiteAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace BlogPostSiteAPI.Repositories
{
    public interface ICategoriesRepository
    {
        Task<IEnumerable<Category>> GetAllCategoriesAsync();

        Task<Category> GetCategoryByIdAsync(Guid id);

    Task<Category> CreateCategoryAsync(Category category);

    // Returns true if a category with the given name (case-insensitive, trimmed) already exists
    Task<bool> CategoryNameExistsAsync(string name);

        Task<bool> DeleteCategoryAsync(Guid id);

    }
}
