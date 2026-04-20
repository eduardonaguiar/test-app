namespace ExamRunner.Infrastructure.Data.Entities;

public sealed class AttemptEntity
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public DateTimeOffset StartedAtUtc { get; set; }
    public DateTimeOffset DeadlineAtUtc { get; set; }
    public DateTimeOffset LastSeenAtUtc { get; set; }
    public DateTimeOffset? SubmittedAtUtc { get; set; }
    public string Status { get; set; } = "InProgress";

    public ExamEntity Exam { get; set; } = null!;
    public List<AttemptAnswerEntity> Answers { get; set; } = [];
    public AttemptResultEntity? Result { get; set; }
    public List<ReconnectEventEntity> ReconnectEvents { get; set; } = [];
}
