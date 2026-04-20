namespace ExamRunner.Infrastructure.Data.Entities;

public sealed class AttemptResultEntity
{
    public Guid Id { get; set; }
    public Guid AttemptId { get; set; }
    public int TotalQuestions { get; set; }
    public int CorrectAnswers { get; set; }
    public int IncorrectAnswers { get; set; }
    public int UnansweredQuestions { get; set; }
    public decimal ScorePercentage { get; set; }
    public bool Passed { get; set; }
    public DateTimeOffset EvaluatedAtUtc { get; set; }

    public AttemptEntity Attempt { get; set; } = null!;
}
