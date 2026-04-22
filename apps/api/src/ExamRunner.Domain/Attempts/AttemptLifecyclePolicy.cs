namespace ExamRunner.Domain.Attempts;

public sealed record ReconnectPolicyDecision(
    int SequenceNumber,
    int OfflineDurationSeconds,
    bool GracePeriodRespected,
    bool MaxReconnectsRespected,
    bool PolicyExceeded,
    bool FinalizeAttempt);

public static class AttemptLifecyclePolicy
{
    public static bool TryFinalizeByDeadline(
        string currentStatus,
        DateTimeOffset deadlineAtUtc,
        DateTimeOffset nowUtc)
    {
        if (currentStatus != AttemptStatuses.InProgress)
        {
            return false;
        }

        return nowUtc >= deadlineAtUtc;
    }

    public static ReconnectPolicyDecision EvaluateReconnect(
        bool reconnectPolicyEnabled,
        int maxReconnectAttempts,
        int reconnectGracePeriodSeconds,
        bool terminateIfExceeded,
        int existingReconnectEvents,
        DateTimeOffset disconnectedAtUtc,
        DateTimeOffset reconnectedAtUtc)
    {
        var sequenceNumber = existingReconnectEvents + 1;
        var offlineDurationSeconds = (int)Math.Max(0, Math.Floor((reconnectedAtUtc - disconnectedAtUtc).TotalSeconds));
        var gracePeriodRespected = !reconnectPolicyEnabled || offlineDurationSeconds <= reconnectGracePeriodSeconds;
        var maxReconnectsRespected = !reconnectPolicyEnabled || sequenceNumber <= maxReconnectAttempts;
        var policyExceeded = reconnectPolicyEnabled && (!gracePeriodRespected || !maxReconnectsRespected);
        var finalizeAttempt = policyExceeded && terminateIfExceeded;

        return new ReconnectPolicyDecision(
            sequenceNumber,
            offlineDurationSeconds,
            gracePeriodRespected,
            maxReconnectsRespected,
            policyExceeded,
            finalizeAttempt);
    }
}
