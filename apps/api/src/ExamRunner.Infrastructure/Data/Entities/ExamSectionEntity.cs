namespace ExamRunner.Infrastructure.Data.Entities;

public sealed class ExamSectionEntity
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public string SectionCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int QuestionCount { get; set; }

    public ExamEntity Exam { get; set; } = null!;
}
