using ExamRunner.Application.Attempts;
using ExamRunner.Domain.Attempts;
using ExamRunner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.Infrastructure.Attempts;

public sealed class AttemptReportingService(ExamRunnerDbContext dbContext) : IAttemptReportingService
{
    public async Task<IReadOnlyList<AttemptHistoryItemSnapshot>> GetHistoryAsync(CancellationToken cancellationToken = default)
    {
        var attempts = await dbContext.Attempts
            .Where(x => x.Status != AttemptStatuses.InProgress)
            .AsNoTracking()
            .OrderByDescending(attempt => attempt.SubmittedAtUtc ?? attempt.StartedAtUtc)
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
        var finalizedAttemptsQuery = dbContext.Attempts
            .Where(x => x.Result != null && x.Status != AttemptStatuses.InProgress)
            .AsNoTracking();

        var trendBase = await finalizedAttemptsQuery
            .OrderBy(attempt => attempt.SubmittedAtUtc ?? attempt.StartedAtUtc)
            .Select(attempt => new
            {
                attempt.Id,
                CompletedAtUtc = attempt.SubmittedAtUtc ?? attempt.StartedAtUtc,
                attempt.Result!.ScorePercentage
            })
            .ToListAsync(cancellationToken);

        var trend = trendBase
            .Select((attempt, index) => new AttemptTrendPointSnapshot(
                attempt.Id,
                $"Tentativa {index + 1}",
                attempt.CompletedAtUtc,
                attempt.ScorePercentage))
            .ToArray();

        var summaryAggregate = await finalizedAttemptsQuery
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalAttempts = group.Count(),
                TotalQuestions = group.Sum(x => x.Result!.TotalQuestions),
                TotalCorrect = group.Sum(x => x.Result!.CorrectAnswers),
                TotalIncorrect = group.Sum(x => x.Result!.IncorrectAnswers),
                AverageAttemptPercentage = group.Average(x => x.Result!.ScorePercentage),
                BestAttemptPercentage = group.Max(x => x.Result!.ScorePercentage)
            })
            .SingleOrDefaultAsync(cancellationToken);

        var totalAttempts = summaryAggregate?.TotalAttempts ?? 0;
        var totalQuestions = summaryAggregate?.TotalQuestions ?? 0;
        var totalCorrect = summaryAggregate?.TotalCorrect ?? 0;
        var totalIncorrect = summaryAggregate?.TotalIncorrect ?? 0;
        var globalAccuracyRate = totalQuestions == 0
            ? 0m
            : decimal.Round((totalCorrect * 100m) / totalQuestions, 2);
        var averageAttemptPercentage = summaryAggregate is null
            ? 0m
            : decimal.Round(summaryAggregate.AverageAttemptPercentage, 2);
        decimal? lastAttemptPercentage = trend.LastOrDefault()?.Percentage;
        decimal? bestAttemptPercentage = summaryAggregate is null
            ? null
            : summaryAggregate.BestAttemptPercentage;

        var topicReviewPayloads = await finalizedAttemptsQuery
            .Select(x => x.Result!.QuestionReviewsJson)
            .ToListAsync(cancellationToken);

        var topicPerformance = topicReviewPayloads
            .SelectMany(AttemptResultProjection.DeserializePersistedQuestionReviews)
            .GroupBy(review => NormalizeTopic(review.Topic), StringComparer.OrdinalIgnoreCase)
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

    private static string NormalizeTopic(string? topic)
    {
        return string.IsNullOrWhiteSpace(topic) ? "Sem tópico" : topic.Trim();
    }
}
