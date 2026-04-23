using ExamRunner.Application.Attempts;
using ExamRunner.Domain.Attempts;
using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ExamRunner.Infrastructure.Attempts;

public sealed class AttemptService(
    ExamRunnerDbContext dbContext,
    TimeProvider timeProvider,
    IAttemptScoringService? attemptScoringService = null) : IAttemptService
{
    private static readonly JsonSerializerOptions ResultSerializationOptions = new(JsonSerializerDefaults.Web);

    public async Task<IReadOnlyList<AttemptHistoryItemSnapshot>> GetHistoryAsync(CancellationToken cancellationToken = default)
    {
        var attempts = await dbContext.Attempts
            .Where(x => x.Status != AttemptStatuses.InProgress)
            .AsNoTracking()
            .Select(attempt => new
            {
                attempt.Id,
                attempt.ExamId,
                ExamTitle = attempt.Exam.Title,
                attempt.StartedAtUtc,
                attempt.LastSeenAtUtc,
                attempt.SubmittedAtUtc,
                attempt.Status,
                CorrectAnswers = attempt.Result != null ? attempt.Result.CorrectAnswers : (int?)null,
                ScorePercentage = attempt.Result != null ? attempt.Result.ScorePercentage : (decimal?)null
            })
            .ToListAsync(cancellationToken);

        return attempts
            .OrderByDescending(attempt => attempt.SubmittedAtUtc ?? attempt.StartedAtUtc)
            .Select(attempt =>
            {
                var effectiveEndAt = attempt.SubmittedAtUtc ?? attempt.LastSeenAtUtc;
                var clampedEndAt = effectiveEndAt < attempt.StartedAtUtc ? attempt.StartedAtUtc : effectiveEndAt;
                var timeSpentSeconds = (int)Math.Max(0, Math.Floor((clampedEndAt - attempt.StartedAtUtc).TotalSeconds));

                return new AttemptHistoryItemSnapshot(
                    attempt.Id,
                    attempt.ExamId,
                    attempt.ExamTitle,
                    attempt.SubmittedAtUtc ?? attempt.StartedAtUtc,
                    attempt.CorrectAnswers,
                    attempt.ScorePercentage,
                    timeSpentSeconds,
                    attempt.Status);
            })
            .ToArray();
    }

    public async Task<PerformanceDashboardSnapshot> GetPerformanceDashboardAsync(CancellationToken cancellationToken = default)
    {
        var attempts = await dbContext.Attempts
            .Include(x => x.Result)
            .Where(x => x.Result != null && x.Status != AttemptStatuses.InProgress)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        attempts = attempts
            .OrderBy(attempt => attempt.SubmittedAtUtc ?? attempt.StartedAtUtc)
            .ToList();

        var trend = attempts
            .Select((attempt, index) => new AttemptTrendPointSnapshot(
                attempt.Id,
                $"Tentativa {index + 1}",
                attempt.SubmittedAtUtc ?? attempt.StartedAtUtc,
                attempt.Result!.ScorePercentage))
            .ToArray();

        var totalAttempts = attempts.Count;
        var totalQuestions = attempts.Sum(x => x.Result!.TotalQuestions);
        var totalCorrect = attempts.Sum(x => x.Result!.CorrectAnswers);
        var totalIncorrect = attempts.Sum(x => x.Result!.IncorrectAnswers);
        var globalAccuracyRate = totalQuestions == 0
            ? 0m
            : decimal.Round((totalCorrect * 100m) / totalQuestions, 2);
        var averageAttemptPercentage = totalAttempts == 0
            ? 0m
            : decimal.Round(attempts.Average(x => x.Result!.ScorePercentage), 2);
        decimal? lastAttemptPercentage = trend.LastOrDefault()?.Percentage;
        decimal? bestAttemptPercentage = totalAttempts == 0
            ? null
            : attempts.Max(x => x.Result!.ScorePercentage);

        var topicPerformance = attempts
            .SelectMany(x => DeserializePersistedQuestionReviews(x.Result!.QuestionReviewsJson))
            .GroupBy(review => string.IsNullOrWhiteSpace(review.Topic) ? "Sem tópico" : review.Topic.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var topic = group.Key;
                var total = group.Count();
                var correct = group.Count(item => item.IsCorrect);
                var incorrect = total - correct;
                var accuracyRate = total == 0 ? 0m : decimal.Round((correct * 100m) / total, 2);

                return new TopicPerformanceSnapshot(
                    topic,
                    total,
                    correct,
                    incorrect,
                    accuracyRate);
            })
            .OrderBy(x => x.AccuracyRate)
            .ThenByDescending(x => x.TotalQuestions)
            .ThenBy(x => x.Topic)
            .ToArray();

        return new PerformanceDashboardSnapshot(
            new PerformanceDashboardSummarySnapshot(
                totalAttempts,
                totalQuestions,
                totalCorrect,
                totalIncorrect,
                globalAccuracyRate,
                averageAttemptPercentage,
                lastAttemptPercentage,
                bestAttemptPercentage),
            trend,
            topicPerformance);
    }

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
        var hasTimelineTransition = ApplyTimelineTransition(attempt, now);

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
        var hasTimelineTransition = ApplyTimelineTransition(attempt, now);

        if (hasTimelineTransition)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        if (attempt.Result is null || !attempt.SubmittedAtUtc.HasValue)
        {
            throw new InvalidOperationException("Result is available only after submission.");
        }

        var questionReviews = DeserializePersistedQuestionReviews(attempt.Result.QuestionReviewsJson);
        var topicAnalysis = DeserializePersistedTopicAnalysis(attempt.Result.TopicAnalysisJson);

        if (questionReviews.Count == 0)
        {
            questionReviews = BuildQuestionReviews(attempt);
        }

        if (topicAnalysis.Count == 0)
        {
            topicAnalysis = BuildTopicAnalysis(attempt, attemptScoringService ?? new ObjectiveAttemptScoringService());
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

    public async Task<AttemptExecutionStateSnapshot?> ReconnectAsync(Guid attemptId, CancellationToken cancellationToken = default)
    {
        for (var retry = 0; retry < 2; retry++)
        {
            var attempt = await LoadAttemptGraphAsync(attemptId, asNoTracking: false, cancellationToken);

            if (attempt is null)
            {
                return null;
            }

            var now = timeProvider.GetUtcNow();
            var hasTimelineTransition = ApplyTimelineTransition(attempt, now);

            if (hasTimelineTransition)
            {
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            if (attempt.Status != AttemptStatuses.InProgress)
            {
                throw new InvalidOperationException("Only attempts in progress can be reconnected.");
            }

            var disconnectedAt = attempt.LastSeenAtUtc;
            var reconnectDecision = AttemptLifecyclePolicy.EvaluateReconnect(
                attempt.Exam.ReconnectEnabled,
                attempt.Exam.MaxReconnectAttempts,
                attempt.Exam.ReconnectGracePeriodSeconds,
                attempt.Exam.ReconnectTerminateIfExceeded,
                attempt.ReconnectEvents.Count,
                disconnectedAt,
                now);

            dbContext.ReconnectEvents.Add(new ReconnectEventEntity
            {
                Id = Guid.NewGuid(),
                AttemptId = attempt.Id,
                SequenceNumber = reconnectDecision.SequenceNumber,
                DisconnectedAtUtc = disconnectedAt,
                ReconnectedAtUtc = now,
                OfflineDurationSeconds = reconnectDecision.OfflineDurationSeconds,
                GracePeriodRespected = reconnectDecision.GracePeriodRespected,
                FinalizedAttempt = reconnectDecision.FinalizeAttempt
            });

            if (reconnectDecision.FinalizeAttempt)
            {
                attempt.Status = AttemptStatuses.Finalized;
                attempt.SubmittedAtUtc ??= now;
            }

            attempt.LastSeenAtUtc = now;

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
                return BuildExecutionStateSnapshot(attempt, now);
            }
            catch (DbUpdateConcurrencyException) when (retry == 0)
            {
                dbContext.ChangeTracker.Clear();
            }
        }

        throw new InvalidOperationException("Could not reconnect attempt due to concurrent updates.");
    }

    public async Task<AttemptExecutionStateSnapshot?> SaveAnswerAsync(SaveAttemptAnswerCommand command, CancellationToken cancellationToken = default)
    {
        var attempt = await LoadAttemptGraphAsync(command.AttemptId, asNoTracking: false, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var now = timeProvider.GetUtcNow();
        var hasTimelineTransition = ApplyTimelineTransition(attempt, now);

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
        var hasTimelineTransition = ApplyTimelineTransition(attempt, now);

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
        var scoredResult = BuildScoredResult(attempt, now, scoringService);
        var questionReviews = BuildQuestionReviews(attempt);
        var topicAnalysis = BuildTopicAnalysis(attempt, scoringService);
        var questionReviewsJson = JsonSerializer.Serialize(questionReviews, ResultSerializationOptions);
        var topicAnalysisJson = JsonSerializer.Serialize(topicAnalysis, ResultSerializationOptions);

        if (attempt.Result is null)
        {
            attempt.Result = scoredResult;
            attempt.Result.QuestionReviewsJson = questionReviewsJson;
            attempt.Result.TopicAnalysisJson = topicAnalysisJson;
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
                question.Options.Single(option => option.IsCorrect).Id,
                question.Weight))
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
            .Include(x => x.Result)
            .Include(x => x.ReconnectEvents)
            .Include(x => x.Exam)
                .ThenInclude(x => x.Sections)
                    .ThenInclude(x => x.Questions)
                        .ThenInclude(x => x.Options)
            .AsSplitQuery()
            .SingleOrDefaultAsync(x => x.Id == attemptId, cancellationToken);
    }

    private static bool ApplyTimelineTransition(AttemptEntity attempt, DateTimeOffset now)
    {
        if (!AttemptLifecyclePolicy.TryFinalizeByDeadline(attempt.Status, attempt.DeadlineAtUtc, now))
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

    private static IReadOnlyList<AttemptResultQuestionReviewSnapshot> BuildQuestionReviews(AttemptEntity attempt)
    {
        var selectedOptionsByQuestionId = attempt.Answers
            .GroupBy(answer => answer.QuestionId)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(answer => answer.UpdatedAtUtc).First().SelectedOptionId);

        return attempt.Exam.Sections
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
                        question.Topic,
                        question.Difficulty,
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
    }

    private static IReadOnlyList<TopicScoreBreakdown> BuildTopicAnalysis(
        AttemptEntity attempt,
        IAttemptScoringService scoringService)
    {
        var questions = attempt.Exam.Sections
            .SelectMany(section => section.Questions)
            .Select(question => new ObjectiveQuestionForScoring(
                question.Id,
                question.Topic,
                question.Options.Single(option => option.IsCorrect).Id,
                question.Weight))
            .ToArray();

        var answers = attempt.Answers
            .Select(answer => new ObjectiveAnswerForScoring(answer.QuestionId, answer.SelectedOptionId))
            .ToArray();

        return scoringService
            .ScoreObjectiveAttempt(questions, answers, attempt.Exam.PassingScorePercentage)
            .TopicBreakdown;
    }

    private static IReadOnlyList<AttemptResultQuestionReviewSnapshot> DeserializePersistedQuestionReviews(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        return JsonSerializer.Deserialize<IReadOnlyList<AttemptResultQuestionReviewSnapshot>>(value, ResultSerializationOptions)
            ?? [];
    }

    private static IReadOnlyList<TopicScoreBreakdown> DeserializePersistedTopicAnalysis(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        return JsonSerializer.Deserialize<IReadOnlyList<TopicScoreBreakdown>>(value, ResultSerializationOptions)
            ?? [];
    }
}
