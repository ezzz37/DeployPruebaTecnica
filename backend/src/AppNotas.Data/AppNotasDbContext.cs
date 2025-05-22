using AppNotas.Domain;
using Microsoft.EntityFrameworkCore;

namespace AppNotas.Data
{
    public class AppNotasDbContext : DbContext
    {
        public AppNotasDbContext(DbContextOptions<AppNotasDbContext> options)
            : base(options)
        { }

        public DbSet<Note> Notes { get; set; } = null!;
        public DbSet<Category> Categories { get; set; } = null!;
        public DbSet<NoteCategory> NoteCategories { get; set; } = null!;
        public DbSet<User> Users { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Mantener tu trigger de UpdatedAt
            modelBuilder.Entity<Note>()
                .Property(n => n.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate();

            // Configuración N:M Note–Category (clave compuesta)
            modelBuilder.Entity<NoteCategory>(nc =>
            {
                nc.HasKey(x => new { x.NoteId, x.CategoryId });

                nc.HasOne(x => x.Note)
                  .WithMany(n => n.NoteCategories)
                  .HasForeignKey(x => x.NoteId);

                nc.HasOne(x => x.Category)
                  .WithMany(c => c.NoteCategories)
                  .HasForeignKey(x => x.CategoryId);
            });
        }
    }
}
