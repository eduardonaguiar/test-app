using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.Infrastructure.Repositories;

public sealed class ExamReadRepository(ExamRunnerDbContext dbContext) : IExamReadRepository
{
    public async Task<IReadOnlyList<ExamCatalogItem>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.Exams
            .AsNoTracking()
            .Select(exam => new ExamCatalogItem(
                exam.Id,
                exam.Title,
                exam.Description,
                exam.DurationMinutes,
                exam.PassingScorePercentage,
                exam.SchemaVersion,
                exam.ReconnectEnabled,
                exam.Sections.Count,
                exam.Sections.SelectMany(section => section.Questions).Count()))
            .OrderBy(x => x.Title)
            .ThenBy(x => x.ExamId)
            .ToListAsync(cancellationToken);
    }

    public async Task<ExamEntity?> GetByIdAsync(Guid examId, CancellationToken cancellationToken = default)
    {
        return await dbContext.Exams
            .AsNoTracking()
            .Include(exam => exam.Sections)
                .ThenInclude(section => section.Questions)
                    .ThenInclude(question => question.Options)
            .SingleOrDefaultAsync(x => x.Id == examId, cancellationToken);
    }
}
