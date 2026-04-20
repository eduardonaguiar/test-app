using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.Infrastructure.Data;

public sealed class ExamRunnerDbContext(DbContextOptions<ExamRunnerDbContext> options) : DbContext(options)
{
    public DbSet<ExamEntity> Exams => Set<ExamEntity>();
    public DbSet<ExamSectionEntity> ExamSections => Set<ExamSectionEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ExamRunnerDbContext).Assembly);
    }
}
