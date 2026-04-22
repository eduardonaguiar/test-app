namespace ExamRunner.Application.Attempts;

public interface IAttemptService
{
    Task<IReadOnlyList<AttemptHistoryItemSnapshot>> GetHistoryAsync(CancellationToken cancellationToken = default);

    Task<PerformanceDashboardSnapshot> GetPerformanceDashboardAsync(CancellationToken cancellationToken = default);

    Task<AttemptSnapshot> CreateAsync(CreateAttemptCommand command, CancellationToken cancellationToken = default);

    Task<AttemptExecutionStateSnapshot?> GetExecutionStateAsync(Guid attemptId, CancellationToken cancellationToken = default);

    Task<AttemptExecutionStateSnapshot?> SaveAnswerAsync(SaveAttemptAnswerCommand command, CancellationToken cancellationToken = default);

    Task<AttemptExecutionStateSnapshot?> ReconnectAsync(Guid attemptId, CancellationToken cancellationToken = default);

    Task<AttemptSnapshot?> SubmitAsync(Guid attemptId, CancellationToken cancellationToken = default);

    Task<AttemptResultSnapshot?> GetResultAsync(Guid attemptId, CancellationToken cancellationToken = default);
}
