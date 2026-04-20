namespace ExamRunner.Infrastructure.Attempts;

public interface IAttemptService
{
    Task<AttemptSnapshot> CreateAsync(CreateAttemptCommand command, CancellationToken cancellationToken = default);
    Task<AttemptExecutionStateSnapshot?> GetExecutionStateAsync(Guid attemptId, CancellationToken cancellationToken = default);
    Task<AttemptExecutionStateSnapshot?> ReconnectAsync(Guid attemptId, CancellationToken cancellationToken = default);
    Task<AttemptExecutionStateSnapshot?> SaveAnswerAsync(SaveAttemptAnswerCommand command, CancellationToken cancellationToken = default);
    Task<AttemptSnapshot?> SubmitAsync(Guid attemptId, CancellationToken cancellationToken = default);
}
