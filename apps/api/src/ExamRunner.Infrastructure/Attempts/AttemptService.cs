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

    public async Task<AttemptExecutionStateSnapshot?> GetExecutionStateAsync(Guid attemptId, CancellationToken cancellationToken = default)
    {
        var attempt = await dbContext.Attempts
            .AsNoTracking()
            .Include(x => x.Answers)
            .Include(x => x.Exam)
                .ThenInclude(x => x.Sections)
                    .ThenInclude(x => x.Questions)
                        .ThenInclude(x => x.Options)
            .AsSplitQuery()
            .SingleOrDefaultAsync(x => x.Id == attemptId, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var selectedOptionsByQuestionId = attempt.Answers
            .GroupBy(x => x.QuestionId)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(answer => answer.UpdatedAtUtc).First().SelectedOptionId);

        var questions = attempt.Exam.Sections
            .OrderBy(section => section.DisplayOrder)
            .SelectMany(section => section.Questions
                .OrderBy(question => question.DisplayOrder)
                .Select(question =>
                {
                    selectedOptionsByQuestionId.TryGetValue(question.Id, out var selectedOptionId);

                    var options = question.Options
                        .OrderBy(option => option.DisplayOrder)
                        .Select(option => new AttemptExecutionQuestionOptionSnapshot(
                            option.Id,
                            option.OptionCode,
                            option.Text,
                            option.DisplayOrder))
                        .ToArray();

                    return new AttemptExecutionQuestionSnapshot(
                        question.Id,
                        section.Id,
                        section.Title,
                        question.QuestionCode,
                        question.Prompt,
                        question.DisplayOrder,
                        selectedOptionId,
                        selectedOptionId.HasValue,
                        options);
                }))
            .ToArray();

        var answeredQuestionCount = questions.Count(question => question.IsAnswered);
        var pendingQuestionCount = questions.Length - answeredQuestionCount;
        var remainingSeconds = (int)Math.Max(0, Math.Floor((attempt.DeadlineAtUtc - timeProvider.GetUtcNow()).TotalSeconds));

        return new AttemptExecutionStateSnapshot(
            attempt.Id,
            attempt.ExamId,
            attempt.Status,
            attempt.StartedAtUtc,
            attempt.DeadlineAtUtc,
            attempt.LastSeenAtUtc,
            attempt.SubmittedAtUtc,
            remainingSeconds,
            answeredQuestionCount,
            pendingQuestionCount,
            questions);
    }
}
