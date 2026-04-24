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
            .SelectMany(x => AttemptResultProjection.DeserializePersistedQuestionReviews(x.Result!.QuestionReviewsJson))
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
}
