namespace ExamRunner.Infrastructure.Data.Entities;

public sealed class ReconnectEventEntity
{
    public Guid Id { get; set; }
    public Guid AttemptId { get; set; }
    public int SequenceNumber { get; set; }
    public DateTimeOffset DisconnectedAtUtc { get; set; }
    public DateTimeOffset ReconnectedAtUtc { get; set; }
    public int OfflineDurationSeconds { get; set; }
    public bool GracePeriodRespected { get; set; }
    public bool FinalizedAttempt { get; set; }

    public AttemptEntity Attempt { get; set; } = null!;
}
