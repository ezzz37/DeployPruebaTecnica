using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AppNotas.Data;
using AppNotas.Domain;
using AppNotas.Api.Models;

namespace AppNotas.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotesController : ControllerBase
{
    private readonly AppNotasDbContext _context;
    public NotesController(AppNotasDbContext context) => _context = context;

    // CRUD de notas

    // GET api/notes/active
    [HttpGet("active")]
    public IActionResult GetActiveNotes()
    {
        var notes = _context.Notes
            .Where(n => !n.Archived)
            .Include(n => n.NoteCategories)
                .ThenInclude(nc => nc.Category)
            .ToList();

        return Ok(notes);
    }

    // GET api/notes/archived
    [HttpGet("archived")]
    public IActionResult GetArchivedNotes()
    {
        var notes = _context.Notes
            .Where(n => n.Archived)
            .Include(n => n.NoteCategories)
                .ThenInclude(nc => nc.Category)
            .ToList();

        return Ok(notes);
    }

    // GET api/notes/{id}
    [HttpGet("{id:guid}")]
    public IActionResult GetNoteById(Guid id)
    {
        var note = _context.Notes
            .Include(n => n.NoteCategories)
                .ThenInclude(nc => nc.Category)
            .FirstOrDefault(n => n.Id == id);

        if (note == null) return NotFound();
        return Ok(note);
    }

    // POST api/notes
    [HttpPost]
    public IActionResult CreateNote([FromBody] Note note)
    {
        note.Id = Guid.NewGuid();
        note.CreatedAt = DateTime.UtcNow;
        note.UpdatedAt = DateTime.UtcNow;
        note.Archived = false;

        _context.Notes.Add(note);
        _context.SaveChanges();

        return CreatedAtAction(nameof(GetNoteById), new { id = note.Id }, note);
    }

    // PUT api/notes/{id}
    [HttpPut("{id:guid}")]
    public IActionResult UpdateNote(Guid id, [FromBody] Note updated)
    {
        var note = _context.Notes.Find(id);
        if (note == null) return NotFound();

        note.Title = updated.Title;
        note.Content = updated.Content;
        note.Archived = updated.Archived;
        note.UpdatedAt = DateTime.UtcNow;

        _context.SaveChanges();
        return NoContent();
    }

    // DELETE api/notes/{id}
    [HttpDelete("{id:guid}")]
    public IActionResult DeleteNote(Guid id)
    {
        var note = _context.Notes.Find(id);
        if (note == null) return NotFound();

        _context.Notes.Remove(note);
        _context.SaveChanges();
        return NoContent();
    }

    // --- Archive / Unarchive

    [HttpPatch("{id:guid}/archive")]
    public IActionResult Archive(Guid id)
    {
        var now = DateTime.UtcNow;
        var rows = _context.Database.ExecuteSqlRaw(
            @"UPDATE dbo.Notes
              SET Archived  = 1,
                  UpdatedAt = {0}
              WHERE Id = {1}",
            now, id);

        return rows > 0 ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/unarchive")]
    public IActionResult Unarchive(Guid id)
    {
        var now = DateTime.UtcNow;
        var rows = _context.Database.ExecuteSqlRaw(
            @"UPDATE dbo.Notes
              SET Archived  = 0,
                  UpdatedAt = {0}
              WHERE Id = {1}",
            now, id);

        return rows > 0 ? NoContent() : NotFound();
    }

    // Asociación Nota–Categoria

    // GET api/notes/{id}/categories
    [HttpGet("{id:guid}/categories")]
    public IActionResult GetNoteCategories(Guid id)
    {
        var note = _context.Notes
            .Include(n => n.NoteCategories)
                .ThenInclude(nc => nc.Category)
            .FirstOrDefault(n => n.Id == id);

        if (note == null) return NotFound();
        var cats = note.NoteCategories
                       .Select(nc => nc.Category)
                       .ToList();
        return Ok(cats);
    }

    // POST api/notes/{id}/categories
    [HttpPost("{id:guid}/categories")]
    public IActionResult AddCategoryToNote(Guid id, [FromBody] AssignCategoryDto dto)
    {
        if (!_context.Notes.Any(n => n.Id == id))
            return NotFound($"Nota {id} no existe.");
        if (!_context.Categories.Any(c => c.Id == dto.CategoryId))
            return NotFound($"Categoría {dto.CategoryId} no existe.");
        if (_context.NoteCategories.Any(nc => nc.NoteId == id && nc.CategoryId == dto.CategoryId))
            return Conflict("La nota ya tiene asignada esa categoria.");

        _context.NoteCategories.Add(new NoteCategory
        {
            NoteId = id,
            CategoryId = dto.CategoryId
        });
        _context.SaveChanges();
        return NoContent();
    }

    // DELETE api/notes/{id}/categories/{categoryId}
    [HttpDelete("{id:guid}/categories/{categoryId:guid}")]
    public IActionResult RemoveCategoryFromNote(Guid id, Guid categoryId)
    {
        var link = _context.NoteCategories
            .FirstOrDefault(nc => nc.NoteId == id
                               && nc.CategoryId == categoryId);
        if (link == null) return NotFound();

        _context.NoteCategories.Remove(link);
        _context.SaveChanges();
        return NoContent();
    }
}
