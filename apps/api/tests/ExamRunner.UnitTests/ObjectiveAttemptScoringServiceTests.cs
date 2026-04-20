using ExamRunner.Infrastructure.Attempts;
using FluentAssertions;

namespace ExamRunner.UnitTests;

public sealed class ObjectiveAttemptScoringServiceTests
{
    private readonly ObjectiveAttemptScoringService sut = new();

    [Fact]
    public void ScoreObjectiveAttempt_ShouldCalculateGlobalResultAndTopicBreakdown()
    {
        var networkTopic = "Networking";
        var securityTopic = "Security";
        var questionAId = Guid.NewGuid();
        var questionBId = Guid.NewGuid();
        var questionCId = Guid.NewGuid();
        var questionDId = Guid.NewGuid();

        var questions = new[]
        {
            new ObjectiveQuestionForScoring(questionAId, networkTopic, Guid.Parse("11111111-1111-1111-1111-111111111111")),
            new ObjectiveQuestionForScoring(questionBId, networkTopic, Guid.Parse("22222222-2222-2222-2222-222222222222")),
            new ObjectiveQuestionForScoring(questionCId, securityTopic, Guid.Parse("33333333-3333-3333-3333-333333333333")),
            new ObjectiveQuestionForScoring(questionDId, securityTopic, Guid.Parse("44444444-4444-4444-4444-444444444444"))
        };

        var answers = new[]
        {
            new ObjectiveAnswerForScoring(questionAId, Guid.Parse("11111111-1111-1111-1111-111111111111")),
            new ObjectiveAnswerForScoring(questionBId, Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")),
            new ObjectiveAnswerForScoring(questionCId, null)
        };

        var result = sut.ScoreObjectiveAttempt(questions, answers, passingScorePercentage: 70);

        result.TotalQuestions.Should().Be(4);
        result.CorrectAnswers.Should().Be(1);
        result.IncorrectAnswers.Should().Be(1);
        result.UnansweredQuestions.Should().Be(2);
        result.ScorePercentage.Should().Be(25m);
        result.Passed.Should().BeFalse();

        result.TopicBreakdown.Should().HaveCount(2);

        var networkingBreakdown = result.TopicBreakdown.Single(x => x.Topic == networkTopic);
        networkingBreakdown.TotalQuestions.Should().Be(2);
        networkingBreakdown.CorrectAnswers.Should().Be(1);
        networkingBreakdown.IncorrectAnswers.Should().Be(1);
        networkingBreakdown.UnansweredQuestions.Should().Be(0);
        networkingBreakdown.ScorePercentage.Should().Be(50m);

        var securityBreakdown = result.TopicBreakdown.Single(x => x.Topic == securityTopic);
        securityBreakdown.TotalQuestions.Should().Be(2);
        securityBreakdown.CorrectAnswers.Should().Be(0);
        securityBreakdown.IncorrectAnswers.Should().Be(0);
        securityBreakdown.UnansweredQuestions.Should().Be(2);
        securityBreakdown.ScorePercentage.Should().Be(0m);
    }

    [Fact]
    public void ScoreObjectiveAttempt_WithPassingThresholdEdge_ShouldMarkAttemptAsPassed()
    {
        var topic = "General";
        var questionAId = Guid.NewGuid();
        var questionBId = Guid.NewGuid();
        var correctOptionA = Guid.Parse("55555555-5555-5555-5555-555555555555");
        var correctOptionB = Guid.Parse("66666666-6666-6666-6666-666666666666");

        var questions = new[]
        {
            new ObjectiveQuestionForScoring(questionAId, topic, correctOptionA),
            new ObjectiveQuestionForScoring(questionBId, topic, correctOptionB)
        };

        var answers = new[]
        {
            new ObjectiveAnswerForScoring(questionAId, correctOptionA),
            new ObjectiveAnswerForScoring(questionBId, Guid.NewGuid())
        };

        var result = sut.ScoreObjectiveAttempt(questions, answers, passingScorePercentage: 50);

        result.ScorePercentage.Should().Be(50m);
        result.Passed.Should().BeTrue();
    }
}
