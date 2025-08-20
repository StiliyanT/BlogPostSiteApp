using BlogPostSiteAPI.Models;
using Microsoft.AspNetCore.Mvc;

namespace BlogPostSiteAPI.Repositories
{
    public interface IAuthorsRepository
    {
        Task<IEnumerable<Author>> GetAllAuthorsAsync();

        Task<Author> GetAuthorByIdAsync(Guid id);

        Task<Author> CreateAuthorAsync(Author author);

        Task<bool> DeleteAuthorAsync(Guid id);

    }
}
