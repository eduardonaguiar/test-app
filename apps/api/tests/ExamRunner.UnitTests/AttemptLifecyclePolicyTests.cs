using ExamRunner.Domain.Attempts;
using FluentAssertions;

namespace ExamRunner.UnitTests;

public sealed class AttemptLifecyclePolicyTests
{
    [Fact]
    public void TryFinalizeByDeadline_WhenAttemptStillInProgressAndDeadlineReached_ShouldReturnTrue()
    {
        var now = new DateTimeOffset(2026, 4, 22, 10, 0, 0, TimeSpan.Zero);

        var shouldFinalize = AttemptLifecyclePolicy.TryFinalizeByDeadline(
            AttemptStatuses.InProgress,
            now,
            now);

        shouldFinalize.Should().BeTrue();
    }

    [Fact]
    public void EvaluateReconnect_WhenGracePeriodExceededAndTerminationEnabled_ShouldFinalizeAttempt()
    {
        var disconnectedAt = new DateTimeOffset(2026, 4, 22, 10, 0, 0, TimeSpan.Zero);
        var reconnectedAt = disconnectedAt.AddSeconds(75);

        var decision = AttemptLifecyclePolicy.EvaluateReconnect(
            reconnectPolicyEnabled: true,
            maxReconnectAttempts: 3,
            reconnectGracePeriodSeconds: 30,
            terminateIfExceeded: true,
            existingReconnectEvents: 1,
            disconnectedAtUtc: disconnectedAt,
            reconnectedAtUtc: reconnectedAt);

        decision.PolicyExceeded.Should().BeTrue();
        decision.FinalizeAttempt.Should().BeTrue();
        decision.SequenceNumber.Should().Be(2);
        decision.OfflineDurationSeconds.Should().Be(75);
    }
}
