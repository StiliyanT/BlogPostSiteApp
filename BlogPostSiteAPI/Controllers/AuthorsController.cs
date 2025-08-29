using BlogPostSiteAPI.Models;
using BlogPostSiteAPI.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace BlogPostSiteAPI.Controllers
{
    [ApiController]
    [Route("api/authors")]
    public class AuthorsController : ControllerBase
    {
        private readonly IAuthorsRepository _repo;
        public AuthorsController(IAuthorsRepository repo)
        {
            _repo = repo;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var authors = await _repo.GetAllAuthorsAsync();
            var slim = authors.Select(a => new { a.Id, a.Name, a.Slug, a.Avatar });
            return Ok(slim);
        }

        [HttpGet("slug/{slug}")]
        public async Task<IActionResult> GetBySlug(string slug)
        {
            var all = await _repo.GetAllAuthorsAsync();
            var found = all.FirstOrDefault(a => string.Equals(a.Slug, slug, StringComparison.OrdinalIgnoreCase));
            if (found == null) return NotFound();
            return Ok(found);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var author = await _repo.GetAuthorByIdAsync(id);
            if (author == null) return NotFound();
            return Ok(author);
        }
    }
}
