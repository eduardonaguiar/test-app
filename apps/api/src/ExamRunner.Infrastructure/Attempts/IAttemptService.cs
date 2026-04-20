namespace ExamRunner.Infrastructure.Attempts;

public interface IAttemptService
{
    Task<AttemptSnapshot> CreateAsync(CreateAttemptCommand command, CancellationToken cancellationToken = default);
}
