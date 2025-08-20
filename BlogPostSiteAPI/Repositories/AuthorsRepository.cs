using BlogPostSiteAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BlogPostSiteAPI.Repositories
{
    public class AuthorsRepository : IAuthorsRepository
    {
        private readonly BlogDbContext _dbContext;

        public AuthorsRepository(BlogDbContext dbContext)
        {
            _dbContext = dbContext;
        }
        public async Task<Author> CreateAuthorAsync(Author author)
        {
            author.Id = Guid.NewGuid();

            _dbContext.Authors.Add(author);
            await _dbContext.SaveChangesAsync();

            return author;
        }

        public async Task<bool> DeleteAuthorAsync(Guid id)
        {
            var author = await _dbContext.Authors.FirstOrDefaultAsync(x => x.Id == id);

            if (author == null)
            {
                return false;
            }
            else
            {
                _dbContext.Authors.Remove(author);
                await _dbContext.SaveChangesAsync();

                return true;
            }
        }

        public async Task<IEnumerable<Author>> GetAllAuthorsAsync()
        {
            return await _dbContext.Authors.ToListAsync();
        }

        public async Task<Author> GetAuthorByIdAsync(Guid id)
        {
            var author = await _dbContext.Authors.FirstOrDefaultAsync(a => a.Id == id);

            if (author == null)
            {
                return null;
            }
            else
            {
                return author;
            }

        }
    }
}
