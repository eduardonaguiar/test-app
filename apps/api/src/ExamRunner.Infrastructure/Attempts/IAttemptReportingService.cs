using ExamRunner.Application.Attempts;

namespace ExamRunner.Infrastructure.Attempts;

public interface IAttemptReportingService
{
    Task<IReadOnlyList<AttemptHistoryItemSnapshot>> GetHistoryAsync(CancellationToken cancellationToken = default);

    Task<PerformanceDashboardSnapshot> GetPerformanceDashboardAsync(CancellationToken cancellationToken = default);
}
