using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppNotas.Data;
using AppNotas.Domain;

namespace AppNotas.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriesController : ControllerBase
    {
        private readonly AppNotasDbContext _context;
        public CategoriesController(AppNotasDbContext context) => _context = context;

        // DTO ligero (sin el modificador static)
        public record CategoryDto(Guid Id, string Name);

        // GET api/categories
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAll()
        {
            var cats = await _context.Categories
                .AsNoTracking()
                .OrderBy(c => c.Name)
                .Select(c => new CategoryDto(c.Id, c.Name))
                .ToListAsync();

            return Ok(cats);
        }

        // GET api/categories/{id}
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<CategoryDto>> GetById(Guid id)
        {
            var cat = await _context.Categories
                .AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => new CategoryDto(c.Id, c.Name))
                .FirstOrDefaultAsync();

            if (cat == null)
                return NotFound();

            return Ok(cat);
        }

        // POST api/categories
        [HttpPost]
        public async Task<ActionResult<CategoryDto>> Create([FromBody] Category category)
        {
            if (string.IsNullOrWhiteSpace(category.Name))
                return BadRequest("El nombre de la categoría no puede estar vacío.");

            var name = category.Name.Trim();
            if (await _context.Categories.AnyAsync(c => c.Name == name))
                return Conflict("Ya existe una categoría con ese nombre.");

            category.Id = Guid.NewGuid();
            category.Name = name;

            _context.Categories.Add(category);
            await _context.SaveChangesAsync();

            var dto = new CategoryDto(category.Id, category.Name);
            return CreatedAtAction(
                nameof(GetById),
                new { id = category.Id },
                dto
            );
        }

        // PUT api/categories/{id}
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] Category updated)
        {
            if (string.IsNullOrWhiteSpace(updated.Name))
                return BadRequest("El nombre de la categoría no puede estar vacío.");

            var category = await _context.Categories.FindAsync(id);
            if (category == null)
                return NotFound();

            var name = updated.Name.Trim();
            if (await _context.Categories.AnyAsync(c => c.Id != id && c.Name == name))
                return Conflict("Ya existe otra categoría con ese nombre.");

            category.Name = name;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE api/categories/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var category = await _context.Categories
                .Include(c => c.NoteCategories)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null)
                return NotFound();

            if (category.NoteCategories.Any())
                return BadRequest("No se puede eliminar: la categoría está asignada a una o más notas.");

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
