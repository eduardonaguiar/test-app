namespace ExamRunner.Infrastructure.Data.Entities;

public sealed class QuestionOptionEntity
{
    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public string OptionCode { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int DisplayOrder { get; set; }

    public QuestionEntity Question { get; set; } = null!;
    public List<AttemptAnswerEntity> AttemptAnswers { get; set; } = [];
}
