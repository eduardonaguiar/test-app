using ExamRunner.Domain.Attempts;
using ExamRunner.Infrastructure.Data.Entities;

namespace ExamRunner.Infrastructure.Attempts;

internal static class AttemptTimelineTransitions
{
    public static bool ApplyTimelineTransition(AttemptEntity attempt, DateTimeOffset now)
    {
        if (!AttemptLifecyclePolicy.TryFinalizeByDeadline(attempt.Status, attempt.DeadlineAtUtc, now))
        {
            return false;
        }

        attempt.Status = AttemptStatuses.Finalized;
        attempt.SubmittedAtUtc ??= attempt.DeadlineAtUtc;
        attempt.LastSeenAtUtc = now;

        return true;
    }
}
