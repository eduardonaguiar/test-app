using ExamRunner.Infrastructure.Data.Entities;

namespace ExamRunner.Infrastructure.Repositories;

public sealed record ExamCatalogItem(
    Guid ExamId,
    string Title,
    string Description,
    int DurationMinutes,
    int PassingScorePercentage,
    string SchemaVersion,
    bool ReconnectEnabled,
    int SectionCount,
    int QuestionCount);

public sealed record AuthoringExamSummary(
    Guid ExamId,
    string Title,
    string Description,
    string Status,
    int QuestionCount,
    int SectionCount,
    DateTimeOffset? UpdatedAtUtc);

public interface IExamReadRepository
{
    Task<IReadOnlyList<ExamCatalogItem>> ListAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AuthoringExamSummary>> ListAuthoringAsync(CancellationToken cancellationToken = default);
    Task<ExamEntity?> GetByIdAsync(Guid examId, CancellationToken cancellationToken = default);
}
