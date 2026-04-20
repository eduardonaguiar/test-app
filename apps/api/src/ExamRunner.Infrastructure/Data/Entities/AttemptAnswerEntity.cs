namespace ExamRunner.Infrastructure.Data.Entities;

public sealed class AttemptAnswerEntity
{
    public Guid Id { get; set; }
    public Guid AttemptId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid? SelectedOptionId { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; }

    public AttemptEntity Attempt { get; set; } = null!;
    public QuestionEntity Question { get; set; } = null!;
    public QuestionOptionEntity? SelectedOption { get; set; }
}
