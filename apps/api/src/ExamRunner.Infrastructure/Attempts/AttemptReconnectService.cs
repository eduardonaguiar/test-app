using ExamRunner.Application.Attempts;
using ExamRunner.Domain.Attempts;
using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.Infrastructure.Attempts;

public sealed class AttemptReconnectService(
    ExamRunnerDbContext dbContext,
    TimeProvider timeProvider) : IAttemptReconnectService
{
    public async Task<AttemptExecutionStateSnapshot?> ReconnectAsync(Guid attemptId, CancellationToken cancellationToken = default)
    {
        for (var retry = 0; retry < 2; retry++)
        {
            var attempt = await LoadAttemptGraphAsync(attemptId, cancellationToken);

            if (attempt is null)
            {
                return null;
            }

            var now = timeProvider.GetUtcNow();
            var hasTimelineTransition = AttemptTimelineTransitions.ApplyTimelineTransition(attempt, now);

            if (hasTimelineTransition)
            {
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            if (attempt.Status != AttemptStatuses.InProgress)
            {
                throw new InvalidOperationException("Only attempts in progress can be reconnected.");
            }

            var disconnectedAt = attempt.LastSeenAtUtc;
            var reconnectDecision = AttemptLifecyclePolicy.EvaluateReconnect(
                attempt.Exam.ReconnectEnabled,
                attempt.Exam.MaxReconnectAttempts,
                attempt.Exam.ReconnectGracePeriodSeconds,
                attempt.Exam.ReconnectTerminateIfExceeded,
                attempt.ReconnectEvents.Count,
                disconnectedAt,
                now);

            dbContext.ReconnectEvents.Add(new ReconnectEventEntity
            {
                Id = Guid.NewGuid(),
                AttemptId = attempt.Id,
                SequenceNumber = reconnectDecision.SequenceNumber,
                DisconnectedAtUtc = disconnectedAt,
                ReconnectedAtUtc = now,
                OfflineDurationSeconds = reconnectDecision.OfflineDurationSeconds,
                GracePeriodRespected = reconnectDecision.GracePeriodRespected,
                FinalizedAttempt = reconnectDecision.FinalizeAttempt
            });

            if (reconnectDecision.FinalizeAttempt)
            {
                attempt.Status = AttemptStatuses.Finalized;
                attempt.SubmittedAtUtc ??= now;
            }

            attempt.LastSeenAtUtc = now;

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
                return AttemptExecutionStateProjector.Build(attempt, now);
            }
            catch (DbUpdateConcurrencyException) when (retry == 0)
            {
                dbContext.ChangeTracker.Clear();
            }
        }

        throw new InvalidOperationException("Could not reconnect attempt due to concurrent updates.");
    }

    private Task<AttemptEntity?> LoadAttemptGraphAsync(Guid attemptId, CancellationToken cancellationToken)
    {
        return dbContext.Attempts
            .Include(x => x.Answers)
            .Include(x => x.Result)
            .Include(x => x.ReconnectEvents)
            .Include(x => x.Exam)
                .ThenInclude(x => x.Sections)
                    .ThenInclude(x => x.Questions)
                        .ThenInclude(x => x.Options)
            .AsSplitQuery()
            .SingleOrDefaultAsync(x => x.Id == attemptId, cancellationToken);
    }
}
