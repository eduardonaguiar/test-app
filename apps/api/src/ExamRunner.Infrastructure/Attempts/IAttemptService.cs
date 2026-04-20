namespace ExamRunner.Infrastructure.Attempts;

public interface IAttemptService
{
    Task<AttemptSnapshot> CreateAsync(CreateAttemptCommand command, CancellationToken cancellationToken = default);
    Task<AttemptExecutionStateSnapshot?> GetExecutionStateAsync(Guid attemptId, CancellationToken cancellationToken = default);
}
