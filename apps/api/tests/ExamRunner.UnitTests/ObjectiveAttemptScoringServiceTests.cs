using ExamRunner.Application.Attempts;
using ExamRunner.Infrastructure.Attempts;
using FluentAssertions;

namespace ExamRunner.UnitTests;

public sealed class ObjectiveAttemptScoringServiceTests
{
    private readonly ObjectiveAttemptScoringService sut = new();

    [Fact]
    public void ScoreObjectiveAttempt_WhenAllAnswersAreCorrect_ShouldReturnFullScoreAndPass()
    {
        var questions = BuildQuestions("General", 3);
        var answers = questions
            .Select(question => new ObjectiveAnswerForScoring(question.QuestionId, question.CorrectOptionId))
            .ToArray();

        var result = sut.ScoreObjectiveAttempt(questions, answers, passingScorePercentage: 70);

        result.TotalQuestions.Should().Be(3);
        result.CorrectAnswers.Should().Be(3);
        result.IncorrectAnswers.Should().Be(0);
        result.UnansweredQuestions.Should().Be(0);
        result.ScorePercentage.Should().Be(100m);
        result.Passed.Should().BeTrue();
    }

    [Fact]
    public void ScoreObjectiveAttempt_WhenAllAnswersAreWrong_ShouldReturnZeroScore()
    {
        var questions = BuildQuestions("General", 3);
        var answers = questions
            .Select(question => new ObjectiveAnswerForScoring(question.QuestionId, Guid.NewGuid()))
            .ToArray();

        var result = sut.ScoreObjectiveAttempt(questions, answers, passingScorePercentage: 10);

        result.TotalQuestions.Should().Be(3);
        result.CorrectAnswers.Should().Be(0);
        result.IncorrectAnswers.Should().Be(3);
        result.UnansweredQuestions.Should().Be(0);
        result.ScorePercentage.Should().Be(0m);
        result.Passed.Should().BeFalse();
    }

    [Fact]
    public void ScoreObjectiveAttempt_WhenAnswersArePartiallyCorrect_ShouldCalculateCountsAndPercentage()
    {
        var questions = BuildQuestions("General", 4);
        var answers = new[]
        {
            new ObjectiveAnswerForScoring(questions[0].QuestionId, questions[0].CorrectOptionId),
            new ObjectiveAnswerForScoring(questions[1].QuestionId, Guid.NewGuid()),
            new ObjectiveAnswerForScoring(questions[2].QuestionId, null)
        };

        var result = sut.ScoreObjectiveAttempt(questions, answers, passingScorePercentage: 30);

        result.TotalQuestions.Should().Be(4);
        result.CorrectAnswers.Should().Be(1);
        result.IncorrectAnswers.Should().Be(1);
        result.UnansweredQuestions.Should().Be(2);
        result.ScorePercentage.Should().Be(25m);
        result.Passed.Should().BeFalse();
    }

    [Fact]
    public void ScoreObjectiveAttempt_WithDifferentWeights_ShouldUseWeightedPercentage()
    {
        var heavyQuestion = new ObjectiveQuestionForScoring(Guid.NewGuid(), "General", Guid.NewGuid(), Weight: 4m);
        var lightQuestion = new ObjectiveQuestionForScoring(Guid.NewGuid(), "General", Guid.NewGuid(), Weight: 1m);
        var questions = new[] { heavyQuestion, lightQuestion };

        var answers = new[]
        {
            new ObjectiveAnswerForScoring(heavyQuestion.QuestionId, heavyQuestion.CorrectOptionId),
            new ObjectiveAnswerForScoring(lightQuestion.QuestionId, Guid.NewGuid())
        };

        var result = sut.ScoreObjectiveAttempt(questions, answers, passingScorePercentage: 75);

        result.CorrectAnswers.Should().Be(1);
        result.IncorrectAnswers.Should().Be(1);
        result.ScorePercentage.Should().Be(80m);
        result.Passed.Should().BeTrue();
    }

    [Fact]
    public void ScoreObjectiveAttempt_ShouldBuildTopicBreakdown()
    {
        var networkingQuestion1 = new ObjectiveQuestionForScoring(Guid.NewGuid(), "Networking", Guid.NewGuid(), Weight: 2m);
        var networkingQuestion2 = new ObjectiveQuestionForScoring(Guid.NewGuid(), "Networking", Guid.NewGuid(), Weight: 1m);
        var securityQuestion = new ObjectiveQuestionForScoring(Guid.NewGuid(), "Security", Guid.NewGuid(), Weight: 3m);

        var questions = new[] { networkingQuestion1, networkingQuestion2, securityQuestion };
        var answers = new[]
        {
            new ObjectiveAnswerForScoring(networkingQuestion1.QuestionId, networkingQuestion1.CorrectOptionId),
            new ObjectiveAnswerForScoring(networkingQuestion2.QuestionId, Guid.NewGuid()),
            new ObjectiveAnswerForScoring(securityQuestion.QuestionId, null)
        };

        var result = sut.ScoreObjectiveAttempt(questions, answers, passingScorePercentage: 50);

        result.TopicBreakdown.Should().HaveCount(2);

        var networking = result.TopicBreakdown.Single(topic => topic.Topic == "Networking");
        networking.TotalQuestions.Should().Be(2);
        networking.CorrectAnswers.Should().Be(1);
        networking.IncorrectAnswers.Should().Be(1);
        networking.UnansweredQuestions.Should().Be(0);
        networking.ScorePercentage.Should().Be(66.67m);

        var security = result.TopicBreakdown.Single(topic => topic.Topic == "Security");
        security.TotalQuestions.Should().Be(1);
        security.CorrectAnswers.Should().Be(0);
        security.IncorrectAnswers.Should().Be(0);
        security.UnansweredQuestions.Should().Be(1);
        security.ScorePercentage.Should().Be(0m);
    }

    private static ObjectiveQuestionForScoring[] BuildQuestions(string topic, int count)
    {
        return Enumerable.Range(0, count)
            .Select(_ => new ObjectiveQuestionForScoring(Guid.NewGuid(), topic, Guid.NewGuid()))
            .ToArray();
    }
}
