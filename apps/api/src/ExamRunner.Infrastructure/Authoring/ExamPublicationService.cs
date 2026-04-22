using ExamRunner.Infrastructure.Data;
using ExamRunner.Infrastructure.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace ExamRunner.Infrastructure.Authoring;

public sealed class ExamPublicationService(ExamRunnerDbContext dbContext, TimeProvider timeProvider) : IExamPublicationService
{
    public async Task<(PublishExamResult? Result, PublishExamFailure? Failure)> PublishAsync(Guid examId, CancellationToken cancellationToken = default)
    {
        var exam = await dbContext.Exams
            .Include(x => x.Sections)
                .ThenInclude(section => section.Questions)
                    .ThenInclude(question => question.Options)
            .SingleOrDefaultAsync(x => x.Id == examId, cancellationToken);

        if (exam is null)
        {
            return (null, new PublishExamFailure("EXAM_NOT_FOUND", $"Nenhuma prova encontrada com id '{examId}'.", EmptyValidation()));
        }

        var validation = Validate(exam);

        if (!validation.IsPublishable)
        {
            return (null, new PublishExamFailure("EXAM_NOT_PUBLISHABLE", "A prova possui inconsistências impeditivas e não pode ser publicada.", validation));
        }

        exam.EditorialStatus = ExamEntity.PublishedStatus;
        exam.PublishedAtUtc = timeProvider.GetUtcNow();

        await dbContext.SaveChangesAsync(cancellationToken);

        return (new PublishExamResult(exam.Id, exam.EditorialStatus, exam.PublishedAtUtc.Value, validation), null);
    }

    private static EditorialValidationResult Validate(ExamEntity exam)
    {
        var blockingErrors = new List<EditorialValidationIssue>();
        var warnings = new List<EditorialValidationIssue>();
        var invalidQuestionIds = new HashSet<Guid>();
        var sectionCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void AddBlocking(EditorialValidationIssue issue, Guid? questionId = null)
        {
            blockingErrors.Add(issue);
            if (questionId.HasValue)
            {
                invalidQuestionIds.Add(questionId.Value);
            }
        }

        void AddWarning(EditorialValidationIssue issue) => warnings.Add(issue);

        if (string.IsNullOrWhiteSpace(exam.Title))
        {
            AddBlocking(new EditorialValidationIssue("EXAM_TITLE_REQUIRED", "blocking", "exam", "Metadados: título da prova está vazio.", "title"));
        }

        if (string.IsNullOrWhiteSpace(exam.Description))
        {
            AddWarning(new EditorialValidationIssue("EXAM_DESCRIPTION_EMPTY", "warning", "exam", "Metadados: descrição está vazia.", "description"));
        }

        if (exam.Sections.Count == 0)
        {
            AddBlocking(new EditorialValidationIssue("EXAM_SECTION_REQUIRED", "blocking", "exam", "Estrutura: adicione ao menos uma seção.", "sections"));
        }

        var questionCount = 0;
        foreach (var (section, sectionIndex) in exam.Sections.OrderBy(s => s.DisplayOrder).Select((value, idx) => (value, idx)))
        {
            if (!sectionCodes.Add(section.SectionCode))
            {
                AddBlocking(new EditorialValidationIssue("SECTION_ID_DUPLICATED", "blocking", "section", $"Seção {sectionIndex + 1}: identificador duplicado.", $"sections[{sectionIndex}].sectionId", section.SectionCode));
            }

            if (string.IsNullOrWhiteSpace(section.Title))
            {
                AddBlocking(new EditorialValidationIssue("SECTION_TITLE_REQUIRED", "blocking", "section", $"Seção {sectionIndex + 1}: título ausente.", $"sections[{sectionIndex}].title", section.SectionCode));
            }

            if (section.Questions.Count == 0)
            {
                AddWarning(new EditorialValidationIssue("SECTION_WITHOUT_QUESTIONS", "warning", "section", $"Seção {sectionIndex + 1}: não possui questões.", $"sections[{sectionIndex}].questions", section.SectionCode));
            }

            foreach (var (question, questionIndex) in section.Questions.OrderBy(q => q.DisplayOrder).Select((value, idx) => (value, idx)))
            {
                questionCount += 1;
                var questionLabel = $"Questão {questionCount}";

                if (string.IsNullOrWhiteSpace(question.Prompt))
                {
                    AddBlocking(new EditorialValidationIssue("QUESTION_PROMPT_REQUIRED", "blocking", "question", $"{questionLabel}: enunciado ausente.", $"sections[{sectionIndex}].questions[{questionIndex}].prompt", question.QuestionCode), question.Id);
                }

                if (question.Options.Count < 2)
                {
                    AddBlocking(new EditorialValidationIssue("QUESTION_OPTIONS_MIN", "blocking", "question", $"{questionLabel}: mínimo de 2 alternativas é obrigatório.", $"sections[{sectionIndex}].questions[{questionIndex}].options", question.QuestionCode), question.Id);
                }

                var optionCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var hasEmptyOptionText = false;
                foreach (var (option, optionIndex) in question.Options.OrderBy(o => o.DisplayOrder).Select((value, idx) => (value, idx)))
                {
                    if (!optionCodes.Add(option.OptionCode))
                    {
                        AddBlocking(new EditorialValidationIssue("QUESTION_OPTION_ID_DUPLICATED", "blocking", "question", $"{questionLabel}: alternativas com identificador duplicado.", $"sections[{sectionIndex}].questions[{questionIndex}].options[{optionIndex}].optionId", question.QuestionCode), question.Id);
                    }

                    if (string.IsNullOrWhiteSpace(option.Text))
                    {
                        hasEmptyOptionText = true;
                    }
                }

                if (hasEmptyOptionText)
                {
                    AddBlocking(new EditorialValidationIssue("QUESTION_OPTION_TEXT_REQUIRED", "blocking", "question", $"{questionLabel}: existe alternativa com texto vazio.", $"sections[{sectionIndex}].questions[{questionIndex}].options", question.QuestionCode), question.Id);
                }

                if (!question.Options.Any(option => option.IsCorrect))
                {
                    AddBlocking(new EditorialValidationIssue("QUESTION_CORRECT_OPTION_REQUIRED", "blocking", "question", $"{questionLabel}: resposta correta não foi definida.", $"sections[{sectionIndex}].questions[{questionIndex}].correctOptionId", question.QuestionCode), question.Id);
                }

                if (string.IsNullOrWhiteSpace(question.Topic))
                {
                    AddWarning(new EditorialValidationIssue("QUESTION_TOPIC_EMPTY", "warning", "question", $"{questionLabel}: tópico não informado.", $"sections[{sectionIndex}].questions[{questionIndex}].topic", question.QuestionCode));
                }

                if (string.IsNullOrWhiteSpace(question.ExplanationSummary))
                {
                    AddWarning(new EditorialValidationIssue("QUESTION_EXPLANATION_SUMMARY_EMPTY", "warning", "question", $"{questionLabel}: explicação resumida está vazia.", $"sections[{sectionIndex}].questions[{questionIndex}].explanationSummary", question.QuestionCode));
                }

                if (string.IsNullOrWhiteSpace(question.ExplanationDetails))
                {
                    AddWarning(new EditorialValidationIssue("QUESTION_EXPLANATION_DETAILED_EMPTY", "warning", "question", $"{questionLabel}: explicação detalhada está vazia.", $"sections[{sectionIndex}].questions[{questionIndex}].explanationDetailed", question.QuestionCode));
                }
            }
        }

        if (questionCount == 0)
        {
            AddBlocking(new EditorialValidationIssue("EXAM_QUESTION_REQUIRED", "blocking", "exam", "Estrutura: adicione ao menos uma questão.", "sections[].questions"));
        }

        var summary = new EditorialValidationSummary(
            BlockingErrorCount: blockingErrors.Count,
            WarningCount: warnings.Count,
            SectionCount: exam.Sections.Count,
            QuestionCount: questionCount,
            ValidQuestionCount: Math.Max(questionCount - invalidQuestionIds.Count, 0));

        return new EditorialValidationResult(blockingErrors.Count == 0, blockingErrors, warnings, summary);
    }

    private static EditorialValidationResult EmptyValidation() =>
        new(false, [], [], new EditorialValidationSummary(0, 0, 0, 0, 0));
}
