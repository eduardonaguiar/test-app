namespace ExamRunner.Infrastructure.Data.Entities;

public sealed class ExamEntity
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public int PassingScorePercentage { get; set; }
    public string SchemaVersion { get; set; } = "1.0.0";

    public List<ExamSectionEntity> Sections { get; set; } = [];
}
