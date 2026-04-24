using FluentValidation;

namespace ExamRunner.Application.Attempts;

public sealed class SaveAttemptAnswerCommandValidator : AbstractValidator<SaveAttemptAnswerCommand>
{
    public SaveAttemptAnswerCommandValidator()
    {
        RuleFor(x => x.AttemptId)
            .NotEmpty()
            .WithMessage("attemptId must be a non-empty GUID.");

        RuleFor(x => x.QuestionId)
            .NotEmpty()
            .WithMessage("questionId must be a non-empty GUID.");
    }
}
