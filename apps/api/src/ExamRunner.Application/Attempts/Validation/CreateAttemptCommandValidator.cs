using FluentValidation;

namespace ExamRunner.Application.Attempts;

public sealed class CreateAttemptCommandValidator : AbstractValidator<CreateAttemptCommand>
{
    public CreateAttemptCommandValidator()
    {
        RuleFor(x => x.ExamId)
            .NotEmpty()
            .WithMessage("examId must be a non-empty GUID.");
    }
}
