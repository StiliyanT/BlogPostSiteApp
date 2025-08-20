using BlogPostSiteAPI.Models;
using BlogPostSiteAPI.Repositories;
using Microsoft.AspNetCore.Mvc;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace BlogPostSiteAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthorsController : ControllerBase
    {
        private readonly AuthorsRepository _authorsRepository;

        public AuthorsController(AuthorsRepository authorsRepository)
        {
            _authorsRepository = authorsRepository;
        }

        // GET: api/<AuthorController>
        [HttpGet]
        public async Task<IActionResult> GetAllAuthors()
        {
            return Ok(await _authorsRepository.GetAllAuthorsAsync());
        }

        // GET api/<AuthorController>/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetAuthorByIdAsync(Guid id)
        {
            var author = await _authorsRepository.GetAuthorByIdAsync(id);

            if (author == null)
            {
                return NotFound("No entity with such Id.");
            }
            else
            {
                return Ok(author);
            }
        }

        // POST api/<AuthorController>
        [HttpPost]
        public async Task<IActionResult> CreateAuthorAsync(Author author)
        {
            author.Id = Guid.NewGuid();

            var newAuthor = await _authorsRepository.CreateAuthorAsync(author);

            return Created($"Entity with name {newAuthor.Name} of type {nameof(newAuthor)} was successfully created.", newAuthor);
        }

        //// PUT api/<AuthorController>/5
        //[HttpPut("{id}")]
        //public async Task<IActionResult> Put(int id, [FromBody] string value)
        //{
        //    return Ok();
        //}

        // DELETE api/<AuthorController>/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAuthorAsync(Guid id)
        {
            var isFoundAndDeleted = await _authorsRepository.DeleteAuthorAsync(id);

            if (!isFoundAndDeleted)
            {
                return NotFound("No entity with given Id.");
            }
            else
            {
                return Ok();
            }
        }
    }
}
