using ExamRunner.Application.Attempts;

namespace ExamRunner.Infrastructure.Attempts;

public interface IAttemptReconnectService
{
    Task<AttemptExecutionStateSnapshot?> ReconnectAsync(Guid attemptId, CancellationToken cancellationToken = default);
}
