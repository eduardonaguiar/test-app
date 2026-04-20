using ExamRunner.Infrastructure.Data.Entities;

namespace ExamRunner.Infrastructure.Repositories;

public interface IExamReadRepository
{
    Task<IReadOnlyList<ExamEntity>> ListAsync(CancellationToken cancellationToken = default);
    Task<ExamEntity?> GetByIdAsync(Guid examId, CancellationToken cancellationToken = default);
}
