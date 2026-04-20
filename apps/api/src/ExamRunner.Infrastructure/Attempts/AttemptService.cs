using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.Infrastructure.Attempts;

public sealed class AttemptService(ExamRunnerDbContext dbContext, TimeProvider timeProvider) : IAttemptService
{
    public async Task<AttemptSnapshot> CreateAsync(CreateAttemptCommand command, CancellationToken cancellationToken = default)
    {
        var exam = await dbContext.Exams
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == command.ExamId, cancellationToken);

        if (exam is null)
        {
            throw new AttemptCreationException(command.ExamId);
        }

        var now = timeProvider.GetUtcNow();
        var deadlineAt = now.AddMinutes(exam.DurationMinutes);

        var attempt = new AttemptEntity
        {
            Id = Guid.NewGuid(),
            ExamId = exam.Id,
            Status = AttemptStatuses.InProgress,
            StartedAtUtc = now,
            DeadlineAtUtc = deadlineAt,
            LastSeenAtUtc = now,
            SubmittedAtUtc = null
        };

        dbContext.Attempts.Add(attempt);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new AttemptSnapshot(
            attempt.Id,
            attempt.ExamId,
            attempt.Status,
            attempt.StartedAtUtc,
            attempt.DeadlineAtUtc,
            attempt.LastSeenAtUtc,
            attempt.SubmittedAtUtc);
    }
}
