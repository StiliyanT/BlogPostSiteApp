using BlogPostSiteAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace BlogPostSiteAPI.Repositories
{
    public interface ICategoriesRepository
    {
        Task<IEnumerable<Category>> GetAllCategoriesAsync();

        Task<Category> GetCategoryByIdAsync(Guid id);

        Task<Category> CreateCategoryAsync(Category category);

        Task<bool> DeleteCategoryAsync(Guid id);

    }
}
