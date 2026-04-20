using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.Infrastructure.Data;

public sealed class ExamRunnerDbContext(DbContextOptions<ExamRunnerDbContext> options) : DbContext(options)
{
    public DbSet<ExamEntity> Exams => Set<ExamEntity>();
    public DbSet<ExamSectionEntity> ExamSections => Set<ExamSectionEntity>();
    public DbSet<QuestionEntity> Questions => Set<QuestionEntity>();
    public DbSet<QuestionOptionEntity> QuestionOptions => Set<QuestionOptionEntity>();
    public DbSet<AttemptEntity> Attempts => Set<AttemptEntity>();
    public DbSet<AttemptAnswerEntity> AttemptAnswers => Set<AttemptAnswerEntity>();
    public DbSet<AttemptResultEntity> AttemptResults => Set<AttemptResultEntity>();
    public DbSet<ReconnectEventEntity> ReconnectEvents => Set<ReconnectEventEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ExamRunnerDbContext).Assembly);
    }
}
