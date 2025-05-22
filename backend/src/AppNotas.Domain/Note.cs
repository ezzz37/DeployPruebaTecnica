using System.Text.Json.Serialization;

namespace AppNotas.Domain
{
    public class Note
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool Archived { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public ICollection<NoteCategory> NoteCategories { get; set; }
            = new List<NoteCategory>();
    }

    public class Category
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public ICollection<NoteCategory> NoteCategories { get; set; }
            = new List<NoteCategory>();
    }

    public class NoteCategory
    {

        public Guid NoteId { get; set; }
        public Guid CategoryId { get; set; }

        public Category Category { get; set; } = null!;

        [JsonIgnore]
        public Note Note { get; set; } = null!;
    }
}
