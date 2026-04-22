using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.Infrastructure.Repositories;

public sealed class ExamReadRepository(ExamRunnerDbContext dbContext) : IExamReadRepository
{
    public async Task<IReadOnlyList<ExamCatalogItem>> ListAsync(CancellationToken cancellationToken = default)
    {
        var exams = await dbContext.Exams
            .AsNoTracking()
            .Where(exam => exam.EditorialStatus == ExamEntity.PublishedStatus)
            .Select(exam => new
            {
                exam.Id,
                exam.Title,
                exam.Description,
                exam.DurationMinutes,
                exam.PassingScorePercentage,
                exam.SchemaVersion,
                exam.ReconnectEnabled,
                SectionCount = dbContext.ExamSections.Count(section => section.ExamId == exam.Id),
                QuestionCount = dbContext.ExamSections
                    .Where(section => section.ExamId == exam.Id)
                    .SelectMany(section => dbContext.Questions.Where(question => question.SectionId == section.Id))
                    .Count()
            })
            .OrderBy(exam => exam.Title)
            .ThenBy(exam => exam.Id)
            .ToListAsync(cancellationToken);

        return exams
            .Select(exam => new ExamCatalogItem(
                exam.Id,
                exam.Title,
                exam.Description,
                exam.DurationMinutes,
                exam.PassingScorePercentage,
                exam.SchemaVersion,
                exam.ReconnectEnabled,
                exam.SectionCount,
                exam.QuestionCount))
            .ToList();
    }

    public async Task<IReadOnlyList<AuthoringExamSummary>> ListAuthoringAsync(CancellationToken cancellationToken = default)
    {
        var exams = await dbContext.Exams
            .AsNoTracking()
            .Select(exam => new
            {
                exam.Id,
                exam.Title,
                exam.Description,
                SectionCount = dbContext.ExamSections.Count(section => section.ExamId == exam.Id),
                QuestionCount = dbContext.ExamSections
                    .Where(section => section.ExamId == exam.Id)
                    .SelectMany(section => dbContext.Questions.Where(question => question.SectionId == section.Id))
                    .Count(),
                LastAttemptAt = dbContext.Attempts
                    .Where(attempt => attempt.ExamId == exam.Id)
                    .Select(attempt => attempt.LastSeenAtUtc)
                    .OrderByDescending(lastSeenAt => lastSeenAt)
                    .FirstOrDefault(),
                exam.EditorialStatus
            })
            .OrderByDescending(exam => exam.LastAttemptAt)
            .ThenBy(exam => exam.Title)
            .ThenBy(exam => exam.Id)
            .ToListAsync(cancellationToken);

        return exams
            .Select(exam => new AuthoringExamSummary(
                ExamId: exam.Id,
                Title: exam.Title,
                Description: exam.Description,
                Status: exam.EditorialStatus,
                QuestionCount: exam.QuestionCount,
                SectionCount: exam.SectionCount,
                UpdatedAtUtc: exam.LastAttemptAt == default ? null : exam.LastAttemptAt))
            .ToList();
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
