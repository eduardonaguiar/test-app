using ExamRunner.Application.Attempts;
using ExamRunner.Domain.Attempts;
using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.Infrastructure.Attempts;

public sealed class AttemptLifecycleService(
    ExamRunnerDbContext dbContext,
    TimeProvider timeProvider,
    IValidator<CreateAttemptCommand>? createAttemptCommandValidator = null,
    IValidator<SaveAttemptAnswerCommand>? saveAttemptAnswerCommandValidator = null,
    IAttemptScoringService? attemptScoringService = null) : IAttemptLifecycleService
{
    private static readonly IValidator<CreateAttemptCommand> FallbackCreateAttemptCommandValidator = new CreateAttemptCommandValidator();
    private static readonly IValidator<SaveAttemptAnswerCommand> FallbackSaveAttemptAnswerCommandValidator = new SaveAttemptAnswerCommandValidator();

    public async Task<AttemptSnapshot> CreateAsync(CreateAttemptCommand command, CancellationToken cancellationToken = default)
    {
        await (createAttemptCommandValidator ?? FallbackCreateAttemptCommandValidator).ValidateAndThrowAsync(command, cancellationToken);
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
        var attempt = await LoadAttemptGraphAsync(attemptId, asNoTracking: false, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var now = timeProvider.GetUtcNow();
        var hasTimelineTransition = AttemptTimelineTransitions.ApplyTimelineTransition(attempt, now);

        if (hasTimelineTransition)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return AttemptExecutionStateProjector.Build(attempt, now);
    }

    public async Task<AttemptResultSnapshot?> GetResultAsync(Guid attemptId, CancellationToken cancellationToken = default)
    {
        var attempt = await LoadAttemptGraphAsync(attemptId, asNoTracking: false, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var now = timeProvider.GetUtcNow();
        var hasTimelineTransition = AttemptTimelineTransitions.ApplyTimelineTransition(attempt, now);

        if (hasTimelineTransition)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (attempt.Result is null || !attempt.SubmittedAtUtc.HasValue)
        {
            throw new InvalidOperationException("Result is available only after submission.");
        }

        var scoringService = attemptScoringService ?? new ObjectiveAttemptScoringService();
        var questionReviews = AttemptResultProjection.DeserializePersistedQuestionReviews(attempt.Result.QuestionReviewsJson);
        var topicAnalysis = AttemptResultProjection.DeserializePersistedTopicAnalysis(attempt.Result.TopicAnalysisJson);

        if (questionReviews.Count == 0)
        {
            questionReviews = AttemptResultProjection.BuildQuestionReviews(attempt);
        }

        if (topicAnalysis.Count == 0)
        {
            topicAnalysis = AttemptResultProjection.BuildTopicAnalysis(attempt, scoringService);
        }

        return new AttemptResultSnapshot(
            attempt.Id,
            attempt.ExamId,
            attempt.Result.CorrectAnswers,
            attempt.Result.ScorePercentage,
            attempt.Result.Passed,
            attempt.Result.Passed ? "aprovado" : "reprovado",
            attempt.Result.TotalQuestions,
            attempt.Result.CorrectAnswers,
            attempt.Result.IncorrectAnswers,
            attempt.Result.UnansweredQuestions,
            attempt.SubmittedAtUtc.Value,
            attempt.Result.EvaluatedAtUtc,
            questionReviews,
            topicAnalysis);
    }

    public async Task<AttemptExecutionStateSnapshot?> SaveAnswerAsync(SaveAttemptAnswerCommand command, CancellationToken cancellationToken = default)
    {
        await (saveAttemptAnswerCommandValidator ?? FallbackSaveAttemptAnswerCommandValidator).ValidateAndThrowAsync(command, cancellationToken);
        var attempt = await LoadAttemptGraphAsync(command.AttemptId, asNoTracking: false, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var now = timeProvider.GetUtcNow();
        var hasTimelineTransition = AttemptTimelineTransitions.ApplyTimelineTransition(attempt, now);

        if (hasTimelineTransition)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (attempt.Status != AttemptStatuses.InProgress)
        {
            throw new InvalidOperationException("Only attempts in progress can accept answers.");
        }

        var question = attempt.Exam.Sections
            .SelectMany(section => section.Questions)
            .SingleOrDefault(question => question.Id == command.QuestionId);

        if (question is null)
        {
            throw new ArgumentException("Question does not belong to this attempt.", nameof(command.QuestionId));
        }

        if (command.SelectedOptionId.HasValue && question.Options.All(option => option.Id != command.SelectedOptionId.Value))
        {
            throw new ArgumentException("Selected option does not belong to this question.", nameof(command.SelectedOptionId));
        }

        var existingAnswer = attempt.Answers.SingleOrDefault(answer => answer.QuestionId == command.QuestionId);

        if (existingAnswer is null)
        {
            dbContext.AttemptAnswers.Add(new AttemptAnswerEntity
            {
                Id = Guid.NewGuid(),
                Attempt = attempt,
                QuestionId = command.QuestionId,
                SelectedOptionId = command.SelectedOptionId,
                UpdatedAtUtc = now
            });
        }
        else
        {
            existingAnswer.SelectedOptionId = command.SelectedOptionId;
            existingAnswer.UpdatedAtUtc = now;
        }

        attempt.LastSeenAtUtc = now;
        await dbContext.SaveChangesAsync(cancellationToken);

        return AttemptExecutionStateProjector.Build(attempt, now);
    }

    public async Task<AttemptSnapshot?> SubmitAsync(Guid attemptId, CancellationToken cancellationToken = default)
    {
        var attempt = await LoadAttemptGraphAsync(attemptId, asNoTracking: false, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var now = timeProvider.GetUtcNow();
        var hasTimelineTransition = AttemptTimelineTransitions.ApplyTimelineTransition(attempt, now);

        if (hasTimelineTransition)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (attempt.Status != AttemptStatuses.InProgress)
        {
            throw new InvalidOperationException("Only attempts in progress can be submitted.");
        }

        attempt.Status = AttemptStatuses.Submitted;
        attempt.SubmittedAtUtc = now;
        attempt.LastSeenAtUtc = now;

        var scoringService = attemptScoringService ?? new ObjectiveAttemptScoringService();
        var scoredResult = AttemptResultProjection.BuildScoredResult(attempt, now, scoringService);
        var questionReviews = AttemptResultProjection.BuildQuestionReviews(attempt);
        var topicAnalysis = AttemptResultProjection.BuildTopicAnalysis(attempt, scoringService);
        var questionReviewsJson = AttemptResultProjection.SerializeQuestionReviews(questionReviews);
        var topicAnalysisJson = AttemptResultProjection.SerializeTopicAnalysis(topicAnalysis);

        if (attempt.Result is null)
        {
            scoredResult.QuestionReviewsJson = questionReviewsJson;
            scoredResult.TopicAnalysisJson = topicAnalysisJson;

            dbContext.AttemptResults.Add(scoredResult);
            attempt.Result = scoredResult;
        }
        else
        {
            attempt.Result.TotalQuestions = scoredResult.TotalQuestions;
            attempt.Result.CorrectAnswers = scoredResult.CorrectAnswers;
            attempt.Result.IncorrectAnswers = scoredResult.IncorrectAnswers;
            attempt.Result.UnansweredQuestions = scoredResult.UnansweredQuestions;
            attempt.Result.ScorePercentage = scoredResult.ScorePercentage;
            attempt.Result.Passed = scoredResult.Passed;
            attempt.Result.EvaluatedAtUtc = scoredResult.EvaluatedAtUtc;
            attempt.Result.QuestionReviewsJson = questionReviewsJson;
            attempt.Result.TopicAnalysisJson = topicAnalysisJson;
        }

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

    private async Task<AttemptEntity?> LoadAttemptGraphAsync(Guid attemptId, bool asNoTracking, CancellationToken cancellationToken)
    {
        IQueryable<AttemptEntity> query = dbContext.Attempts;

        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return await query
            .Include(x => x.Answers)
            .Include(x => x.Result)
            .Include(x => x.ReconnectEvents)
            .Include(x => x.Exam)
                .ThenInclude(x => x.Sections)
                    .ThenInclude(x => x.Questions)
                        .ThenInclude(x => x.Options)
            .AsSplitQuery()
            .SingleOrDefaultAsync(x => x.Id == attemptId, cancellationToken);
    }
}
