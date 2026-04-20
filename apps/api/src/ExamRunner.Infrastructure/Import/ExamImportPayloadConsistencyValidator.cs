namespace ExamRunner.Infrastructure.Import;

public sealed class ExamImportPayloadConsistencyValidator : IExamImportPayloadConsistencyValidator
{
    public IEnumerable<ExamImportValidationError> Validate(ImportExamPayload payload)
    {
        var sectionIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var questionIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var sectionIndex = 0; sectionIndex < payload.Sections.Count; sectionIndex++)
        {
            var section = payload.Sections[sectionIndex];
            var sectionPath = $"$.sections[{sectionIndex}]";

            if (!sectionIds.Add(section.SectionId))
            {
                yield return new ExamImportValidationError($"{sectionPath}.sectionId", $"Section id '{section.SectionId}' is duplicated.");
            }

            for (var questionIndex = 0; questionIndex < section.Questions.Count; questionIndex++)
            {
                var question = section.Questions[questionIndex];
                var questionPath = $"{sectionPath}.questions[{questionIndex}]";

                if (!questionIds.Add(question.QuestionId))
                {
                    yield return new ExamImportValidationError($"{questionPath}.questionId", $"Question id '{question.QuestionId}' is duplicated across sections.");
                }

                var optionIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var hasCorrectOption = false;

                for (var optionIndex = 0; optionIndex < question.Options.Count; optionIndex++)
                {
                    var option = question.Options[optionIndex];
                    var optionPath = $"{questionPath}.options[{optionIndex}]";

                    if (!optionIds.Add(option.OptionId))
                    {
                        yield return new ExamImportValidationError($"{optionPath}.optionId", $"Option id '{option.OptionId}' is duplicated in question '{question.QuestionId}'.");
                    }

                    if (string.Equals(option.OptionId, question.CorrectOptionId, StringComparison.OrdinalIgnoreCase))
                    {
                        hasCorrectOption = true;
                    }
                }

                if (!hasCorrectOption)
                {
                    yield return new ExamImportValidationError(
                        $"{questionPath}.correctOptionId",
                        $"Correct option id '{question.CorrectOptionId}' was not found in question '{question.QuestionId}'.");
                }
            }
        }
    }
}
