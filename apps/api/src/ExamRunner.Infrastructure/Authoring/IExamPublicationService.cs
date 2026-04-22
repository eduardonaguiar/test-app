namespace ExamRunner.Infrastructure.Authoring;

public interface IExamPublicationService
{
    Task<(PublishExamResult? Result, PublishExamFailure? Failure)> PublishAsync(Guid examId, CancellationToken cancellationToken = default);
}
