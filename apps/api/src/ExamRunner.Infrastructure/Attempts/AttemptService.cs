using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.Infrastructure.Attempts;

public sealed class AttemptService(
    ExamRunnerDbContext dbContext,
    TimeProvider timeProvider,
    IAttemptScoringService? attemptScoringService = null) : IAttemptService
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
        var attempt = await LoadAttemptGraphAsync(attemptId, asNoTracking: false, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var now = timeProvider.GetUtcNow();
        var hasTimelineTransition = UpdateAttemptStatusFromTimeline(attempt, now);

        if (hasTimelineTransition)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return BuildExecutionStateSnapshot(attempt, now);
    }

    public async Task<AttemptResultSnapshot?> GetResultAsync(Guid attemptId, CancellationToken cancellationToken = default)
    {
        var attempt = await LoadAttemptGraphAsync(attemptId, asNoTracking: false, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var now = timeProvider.GetUtcNow();
        var hasTimelineTransition = UpdateAttemptStatusFromTimeline(attempt, now);

        if (hasTimelineTransition)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (attempt.Result is null || !attempt.SubmittedAtUtc.HasValue)
        {
            throw new InvalidOperationException("Result is available only after submission.");
        }

        var questions = attempt.Exam.Sections
            .SelectMany(section => section.Questions)
            .Select(question => new ObjectiveQuestionForScoring(
                question.Id,
                question.Topic,
                question.Options.Single(option => option.IsCorrect).Id))
            .ToArray();

        var answers = attempt.Answers
            .Select(answer => new ObjectiveAnswerForScoring(answer.QuestionId, answer.SelectedOptionId))
            .ToArray();

        var topicAnalysis = (attemptScoringService ?? new ObjectiveAttemptScoringService())
            .ScoreObjectiveAttempt(questions, answers, attempt.Exam.PassingScorePercentage)
            .TopicBreakdown;

        var selectedOptionsByQuestionId = attempt.Answers
            .GroupBy(answer => answer.QuestionId)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(answer => answer.UpdatedAtUtc).First().SelectedOptionId);

        var questionReviews = attempt.Exam.Sections
            .OrderBy(section => section.DisplayOrder)
            .SelectMany(section => section.Questions
                .OrderBy(question => question.DisplayOrder)
                .Select(question =>
                {
                    selectedOptionsByQuestionId.TryGetValue(question.Id, out var selectedOptionId);

                    var correctOption = question.Options.Single(option => option.IsCorrect);
                    var userOption = selectedOptionId.HasValue
                        ? question.Options.SingleOrDefault(option => option.Id == selectedOptionId.Value)
                        : null;

                    return new AttemptResultQuestionReviewSnapshot(
                        question.Id,
                        section.Id,
                        section.Title,
                        question.QuestionCode,
                        question.Prompt,
                        userOption?.Id,
                        userOption?.OptionCode,
                        userOption?.Text,
                        correctOption.Id,
                        correctOption.OptionCode,
                        correctOption.Text,
                        userOption?.Id == correctOption.Id,
                        question.ExplanationSummary,
                        question.ExplanationDetails);
                }))
            .ToArray();

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

    public async Task<AttemptExecutionStateSnapshot?> ReconnectAsync(Guid attemptId, CancellationToken cancellationToken = default)
    {
        var attempt = await LoadAttemptGraphAsync(attemptId, asNoTracking: false, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var now = timeProvider.GetUtcNow();
        var hasTimelineTransition = UpdateAttemptStatusFromTimeline(attempt, now);

        if (hasTimelineTransition)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (attempt.Status != AttemptStatuses.InProgress)
        {
            throw new InvalidOperationException("Only attempts in progress can be reconnected.");
        }

        var reconnectSequence = attempt.ReconnectEvents.Count + 1;
        var disconnectedAt = attempt.LastSeenAtUtc;
        var offlineDurationSeconds = (int)Math.Max(0, Math.Floor((now - disconnectedAt).TotalSeconds));
        var reconnectPolicyEnabled = attempt.Exam.ReconnectEnabled;
        var gracePeriodRespected = !reconnectPolicyEnabled || offlineDurationSeconds <= attempt.Exam.ReconnectGracePeriodSeconds;
        var maxReconnectsRespected = !reconnectPolicyEnabled || reconnectSequence <= attempt.Exam.MaxReconnectAttempts;
        var policyExceeded = reconnectPolicyEnabled && (!gracePeriodRespected || !maxReconnectsRespected);
        var finalizeAttempt = policyExceeded && attempt.Exam.ReconnectTerminateIfExceeded;

        attempt.ReconnectEvents.Add(new ReconnectEventEntity
        {
            Id = Guid.NewGuid(),
            AttemptId = attempt.Id,
            SequenceNumber = reconnectSequence,
            DisconnectedAtUtc = disconnectedAt,
            ReconnectedAtUtc = now,
            OfflineDurationSeconds = offlineDurationSeconds,
            GracePeriodRespected = gracePeriodRespected,
            FinalizedAttempt = finalizeAttempt
        });

        if (finalizeAttempt)
        {
            attempt.Status = AttemptStatuses.Finalized;
            attempt.SubmittedAtUtc ??= now;
        }

        attempt.LastSeenAtUtc = now;
        await dbContext.SaveChangesAsync(cancellationToken);

        return BuildExecutionStateSnapshot(attempt, now);
    }

    public async Task<AttemptExecutionStateSnapshot?> SaveAnswerAsync(SaveAttemptAnswerCommand command, CancellationToken cancellationToken = default)
    {
        var attempt = await LoadAttemptGraphAsync(command.AttemptId, asNoTracking: false, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var now = timeProvider.GetUtcNow();
        var hasTimelineTransition = UpdateAttemptStatusFromTimeline(attempt, now);

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
            attempt.Answers.Add(new AttemptAnswerEntity
            {
                Id = Guid.NewGuid(),
                AttemptId = attempt.Id,
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

        return BuildExecutionStateSnapshot(attempt, now);
    }

    public async Task<AttemptSnapshot?> SubmitAsync(Guid attemptId, CancellationToken cancellationToken = default)
    {
        var attempt = await dbContext.Attempts
            .Include(x => x.Answers)
            .Include(x => x.Result)
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

        var now = timeProvider.GetUtcNow();
        var hasTimelineTransition = UpdateAttemptStatusFromTimeline(attempt, now);

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

        var scoredResult = BuildScoredResult(attempt, now, attemptScoringService ?? new ObjectiveAttemptScoringService());

        if (attempt.Result is null)
        {
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

    private static AttemptResultEntity BuildScoredResult(
        AttemptEntity attempt,
        DateTimeOffset evaluatedAtUtc,
        IAttemptScoringService scoringService)
    {
        var objectiveQuestions = attempt.Exam.Sections
            .SelectMany(section => section.Questions)
            .Select(question => new ObjectiveQuestionForScoring(
                question.Id,
                question.Topic,
                question.Options.Single(option => option.IsCorrect).Id))
            .ToList();

        var objectiveAnswers = attempt.Answers
            .Select(answer => new ObjectiveAnswerForScoring(answer.QuestionId, answer.SelectedOptionId))
            .ToArray();

        var scoreResult = scoringService.ScoreObjectiveAttempt(
            objectiveQuestions,
            objectiveAnswers,
            attempt.Exam.PassingScorePercentage);

        return new AttemptResultEntity
        {
            Id = Guid.NewGuid(),
            AttemptId = attempt.Id,
            TotalQuestions = scoreResult.TotalQuestions,
            CorrectAnswers = scoreResult.CorrectAnswers,
            IncorrectAnswers = scoreResult.IncorrectAnswers,
            UnansweredQuestions = scoreResult.UnansweredQuestions,
            ScorePercentage = scoreResult.ScorePercentage,
            Passed = scoreResult.Passed,
            EvaluatedAtUtc = evaluatedAtUtc
        };
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
            .Include(x => x.ReconnectEvents)
            .Include(x => x.Exam)
                .ThenInclude(x => x.Sections)
                    .ThenInclude(x => x.Questions)
                        .ThenInclude(x => x.Options)
            .AsSplitQuery()
            .SingleOrDefaultAsync(x => x.Id == attemptId, cancellationToken);
    }

    private static bool UpdateAttemptStatusFromTimeline(AttemptEntity attempt, DateTimeOffset now)
    {
        if (attempt.Status != AttemptStatuses.InProgress)
        {
            return false;
        }

        if (now < attempt.DeadlineAtUtc)
        {
            return false;
        }

        attempt.Status = AttemptStatuses.Finalized;
        attempt.SubmittedAtUtc ??= attempt.DeadlineAtUtc;
        attempt.LastSeenAtUtc = now;

        return true;
    }

    private AttemptExecutionStateSnapshot BuildExecutionStateSnapshot(AttemptEntity attempt, DateTimeOffset now)
    {
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
        var remainingSeconds = (int)Math.Max(0, Math.Floor((attempt.DeadlineAtUtc - now).TotalSeconds));

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
