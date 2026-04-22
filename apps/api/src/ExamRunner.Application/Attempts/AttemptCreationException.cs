namespace ExamRunner.Application.Attempts;

public sealed class AttemptCreationException(Guid examId)
    : Exception($"Exam with id '{examId}' was not found.")
{
    public Guid ExamId { get; } = examId;
}
