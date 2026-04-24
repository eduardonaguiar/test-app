using ExamRunner.Application.Attempts;

namespace ExamRunner.Infrastructure.Attempts;

public interface IAttemptLifecycleService
{
    Task<AttemptSnapshot> CreateAsync(CreateAttemptCommand command, CancellationToken cancellationToken = default);

    Task<AttemptExecutionStateSnapshot?> GetExecutionStateAsync(Guid attemptId, CancellationToken cancellationToken = default);

    Task<AttemptResultSnapshot?> GetResultAsync(Guid attemptId, CancellationToken cancellationToken = default);

    Task<AttemptExecutionStateSnapshot?> SaveAnswerAsync(SaveAttemptAnswerCommand command, CancellationToken cancellationToken = default);

    Task<AttemptSnapshot?> SubmitAsync(Guid attemptId, CancellationToken cancellationToken = default);
}
