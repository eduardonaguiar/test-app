namespace ExamRunner.Infrastructure.Data.Entities;

public sealed class QuestionEntity
{
    public Guid Id { get; set; }
    public Guid SectionId { get; set; }
    public string QuestionCode { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string ExplanationSummary { get; set; } = string.Empty;
    public string ExplanationDetails { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public decimal Weight { get; set; } = 1.0m;
    public int DisplayOrder { get; set; }

    public ExamSectionEntity Section { get; set; } = null!;
    public List<QuestionOptionEntity> Options { get; set; } = [];
    public List<AttemptAnswerEntity> AttemptAnswers { get; set; } = [];
}
