using ExamRunner.Api.Contracts.Attempts;
using FluentValidation;

namespace ExamRunner.Api.Validation.Requests;

public sealed class CreateAttemptRequestValidator : AbstractValidator<CreateAttemptRequest>
{
    public CreateAttemptRequestValidator()
    {
        RuleFor(x => x.ExamId)
            .NotEmpty()
            .WithMessage("examId must be a non-empty GUID.");
    }
}
