using BlogPostSiteAPI.Models;
using BlogPostSiteAPI.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace BlogPostSiteAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoriesRepository _categoriesRepository;

        public CategoriesController(ICategoriesRepository categoriesRepository)
        {
            _categoriesRepository = categoriesRepository;
        }

        // GET: api/<CategoriesController>
        [HttpGet]
        public async Task<IActionResult> GetAllCategoriesAsync()
        {
            return Ok(await _categoriesRepository.GetAllCategoriesAsync());
        }

        // GET api/<CategoriesController>/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCategoryByIdAsync(Guid id)
        {
            var category = await _categoriesRepository.GetCategoryByIdAsync(id);

            if (category == null) 
            { 
                return NotFound("No entity with such Id."); 
            } 
            else
            {
                return Ok(category);
            }
           
        }

        // POST api/<CategoriesController>
        [HttpPost]
        public async Task<IActionResult> CreateCategoryAsync([FromBody] Category category)
        {
            if (category == null) return BadRequest("Missing category body");
            var newCategory = await _categoriesRepository.CreateCategoryAsync(category);
            return CreatedAtAction(nameof(GetCategoryByIdAsync), new { id = newCategory.Id }, newCategory);
        }

        // PUT api/<CategoriesController>/5
        //[HttpPut("{id}")]
        //public async Task<IActionResult> UpdateCategory(Guid id, Category updatedCategory)
        //{
        //    if (id != updatedCategory.Id)
        //        return BadRequest("ID mismatch");

        //}

        // DELETE api/<CategoriesController>/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategoryAsync(Guid id)
        {

            var isFoundAndDeleted = await _categoriesRepository.DeleteCategoryAsync(id);

            if(!isFoundAndDeleted)
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
