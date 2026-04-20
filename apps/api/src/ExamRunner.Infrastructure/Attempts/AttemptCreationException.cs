namespace ExamRunner.Infrastructure.Attempts;

public sealed class AttemptCreationException(Guid examId)
    : Exception($"No exam found with id '{examId}'.")
{
    public Guid ExamId { get; } = examId;
}
