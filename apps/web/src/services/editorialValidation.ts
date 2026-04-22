import type { EditorExamDraft } from './authoringEditor';
import {
  DESCRIPTION_MAX_LENGTH,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
} from '../components/editor/generalMetadataValidation';

export type ValidationSeverity = 'blocking' | 'warning';
export type ValidationScope = 'exam' | 'section' | 'question';

export type ValidationIssue = {
  code: string;
  severity: ValidationSeverity;
  scope: ValidationScope;
  message: string;
  path?: string;
  entityId?: string;
};

export type EditorialValidationResult = {
  isPublishable: boolean;
  blockingErrors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    blockingErrorCount: number;
    warningCount: number;
    sectionCount: number;
    questionCount: number;
    validQuestionCount: number;
  };
};

function createIssue(issue: ValidationIssue): ValidationIssue {
  return issue;
}

export function validateExamEditorialState(draft: EditorExamDraft): EditorialValidationResult {
  const blockingErrors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const invalidQuestionIds = new Set<string>();
  const sectionIds = new Set<string>();

  const addBlockingIssue = (issue: ValidationIssue) => {
    blockingErrors.push(createIssue(issue));
    if (issue.scope === 'question' && issue.entityId) {
      invalidQuestionIds.add(issue.entityId);
    }
  };

  const addWarningIssue = (issue: ValidationIssue) => {
    warnings.push(createIssue(issue));
  };

  const title = draft.title.trim();
  if (!title) {
    addBlockingIssue({
      code: 'EXAM_TITLE_REQUIRED',
      severity: 'blocking',
      scope: 'exam',
      message: 'Metadados: título da prova está vazio.',
      path: 'title',
    });
  } else {
    if (title.length < TITLE_MIN_LENGTH) {
      addBlockingIssue({
        code: 'EXAM_TITLE_TOO_SHORT',
        severity: 'blocking',
        scope: 'exam',
        message: `Metadados: título deve ter ao menos ${TITLE_MIN_LENGTH} caracteres.`,
        path: 'title',
      });
    }

    if (title.length > TITLE_MAX_LENGTH) {
      addBlockingIssue({
        code: 'EXAM_TITLE_TOO_LONG',
        severity: 'blocking',
        scope: 'exam',
        message: `Metadados: título excede o máximo de ${TITLE_MAX_LENGTH} caracteres.`,
        path: 'title',
      });
    }
  }

  if (draft.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    addBlockingIssue({
      code: 'EXAM_DESCRIPTION_TOO_LONG',
      severity: 'blocking',
      scope: 'exam',
      message: `Metadados: descrição excede o máximo de ${DESCRIPTION_MAX_LENGTH} caracteres.`,
      path: 'description',
    });
  } else if (!draft.description.trim()) {
    addWarningIssue({
      code: 'EXAM_DESCRIPTION_EMPTY',
      severity: 'warning',
      scope: 'exam',
      message: 'Metadados: descrição está vazia.',
      path: 'description',
    });
  }

  if (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes < MIN_DURATION_MINUTES || draft.durationMinutes > MAX_DURATION_MINUTES) {
    addBlockingIssue({
      code: 'EXAM_DURATION_INVALID',
      severity: 'blocking',
      scope: 'exam',
      message: `Metadados: duração inválida. Use valor inteiro entre ${MIN_DURATION_MINUTES} e ${MAX_DURATION_MINUTES} minutos.`,
      path: 'durationMinutes',
    });
  } else if (draft.durationMinutes < 10 || draft.durationMinutes > 240) {
    addWarningIssue({
      code: 'EXAM_DURATION_UNUSUAL',
      severity: 'warning',
      scope: 'exam',
      message: 'Metadados: duração fora da faixa mais comum (10–240 minutos).',
      path: 'durationMinutes',
    });
  }

  if (!Number.isInteger(draft.passingScorePercentage) || draft.passingScorePercentage < 0 || draft.passingScorePercentage > 100) {
    addBlockingIssue({
      code: 'EXAM_PASSING_SCORE_INVALID',
      severity: 'blocking',
      scope: 'exam',
      message: 'Metadados: nota de corte inválida. Use percentual entre 0 e 100.',
      path: 'passingScorePercentage',
    });
  }

  if (draft.reconnectPolicy.enabled) {
    const hasUnusualReconnectPolicy =
      draft.reconnectPolicy.maxReconnectAttempts > 10 || draft.reconnectPolicy.gracePeriodSeconds > 900;
    if (hasUnusualReconnectPolicy) {
      addWarningIssue({
        code: 'EXAM_RECONNECT_POLICY_UNUSUAL',
        severity: 'warning',
        scope: 'exam',
        message: 'Metadados: política de reconexão com valores incomuns para uso editorial.',
        path: 'reconnectPolicy',
      });
    }
  }

  if (draft.sections.length === 0) {
    addBlockingIssue({
      code: 'EXAM_SECTION_REQUIRED',
      severity: 'blocking',
      scope: 'exam',
      message: 'Estrutura: adicione ao menos uma seção.',
      path: 'sections',
    });
  }

  let questionCount = 0;

  draft.sections.forEach((section, sectionIndex) => {
    if (sectionIds.has(section.sectionId)) {
      addBlockingIssue({
        code: 'SECTION_ID_DUPLICATED',
        severity: 'blocking',
        scope: 'section',
        message: `Seção ${sectionIndex + 1}: identificador duplicado.`,
        path: `sections[${sectionIndex}].sectionId`,
        entityId: section.sectionId,
      });
    }

    sectionIds.add(section.sectionId);

    if (!section.title.trim()) {
      addBlockingIssue({
        code: 'SECTION_TITLE_REQUIRED',
        severity: 'blocking',
        scope: 'section',
        message: `Seção ${sectionIndex + 1}: título ausente.`,
        path: `sections[${sectionIndex}].title`,
        entityId: section.sectionId,
      });
    }

    if (section.questions.length === 0) {
      addWarningIssue({
        code: 'SECTION_WITHOUT_QUESTIONS',
        severity: 'warning',
        scope: 'section',
        message: `Seção ${sectionIndex + 1}: não possui questões.`,
        path: `sections[${sectionIndex}].questions`,
        entityId: section.sectionId,
      });
    }

    section.questions.forEach((question, questionIndex) => {
      questionCount += 1;
      const questionLabel = `Questão ${questionCount}`;

      if (!question.prompt.trim()) {
        addBlockingIssue({
          code: 'QUESTION_PROMPT_REQUIRED',
          severity: 'blocking',
          scope: 'question',
          message: `${questionLabel}: enunciado ausente.`,
          path: `sections[${sectionIndex}].questions[${questionIndex}].prompt`,
          entityId: question.questionId,
        });
      }

      if (question.options.length < 2) {
        addBlockingIssue({
          code: 'QUESTION_OPTIONS_MIN',
          severity: 'blocking',
          scope: 'question',
          message: `${questionLabel}: mínimo de 2 alternativas é obrigatório.`,
          path: `sections[${sectionIndex}].questions[${questionIndex}].options`,
          entityId: question.questionId,
        });
      }

      const optionIds = new Set<string>();
      let hasEmptyOptionText = false;
      question.options.forEach((option, optionIndex) => {
        if (optionIds.has(option.optionId)) {
          addBlockingIssue({
            code: 'QUESTION_OPTION_ID_DUPLICATED',
            severity: 'blocking',
            scope: 'question',
            message: `${questionLabel}: alternativas com identificador duplicado.`,
            path: `sections[${sectionIndex}].questions[${questionIndex}].options[${optionIndex}].optionId`,
            entityId: question.questionId,
          });
        }
        optionIds.add(option.optionId);

        if (!option.text.trim()) {
          hasEmptyOptionText = true;
        }
      });

      if (hasEmptyOptionText) {
        addBlockingIssue({
          code: 'QUESTION_OPTION_TEXT_REQUIRED',
          severity: 'blocking',
          scope: 'question',
          message: `${questionLabel}: existe alternativa com texto vazio.`,
          path: `sections[${sectionIndex}].questions[${questionIndex}].options`,
          entityId: question.questionId,
        });
      }

      if (!question.correctOptionId) {
        addBlockingIssue({
          code: 'QUESTION_CORRECT_OPTION_REQUIRED',
          severity: 'blocking',
          scope: 'question',
          message: `${questionLabel}: resposta correta não foi definida.`,
          path: `sections[${sectionIndex}].questions[${questionIndex}].correctOptionId`,
          entityId: question.questionId,
        });
      } else if (!question.options.some((option) => option.optionId === question.correctOptionId)) {
        addBlockingIssue({
          code: 'QUESTION_CORRECT_OPTION_NOT_FOUND',
          severity: 'blocking',
          scope: 'question',
          message: `${questionLabel}: alternativa correta não existe na lista de opções.`,
          path: `sections[${sectionIndex}].questions[${questionIndex}].correctOptionId`,
          entityId: question.questionId,
        });
      }

      if (!question.topic?.trim()) {
        addWarningIssue({
          code: 'QUESTION_TOPIC_EMPTY',
          severity: 'warning',
          scope: 'question',
          message: `${questionLabel}: tópico não informado.`,
          path: `sections[${sectionIndex}].questions[${questionIndex}].topic`,
          entityId: question.questionId,
        });
      }

      if (!question.difficulty) {
        addWarningIssue({
          code: 'QUESTION_DIFFICULTY_EMPTY',
          severity: 'warning',
          scope: 'question',
          message: `${questionLabel}: dificuldade não informada.`,
          path: `sections[${sectionIndex}].questions[${questionIndex}].difficulty`,
          entityId: question.questionId,
        });
      }

      if (!Number.isFinite(question.weight) || question.weight <= 0 || question.weight > 5) {
        addWarningIssue({
          code: 'QUESTION_WEIGHT_UNUSUAL',
          severity: 'warning',
          scope: 'question',
          message: `${questionLabel}: peso fora da faixa recomendada (0 < peso ≤ 5).`,
          path: `sections[${sectionIndex}].questions[${questionIndex}].weight`,
          entityId: question.questionId,
        });
      }

      if (!question.explanationSummary.trim()) {
        addWarningIssue({
          code: 'QUESTION_EXPLANATION_SUMMARY_EMPTY',
          severity: 'warning',
          scope: 'question',
          message: `${questionLabel}: explicação resumida está vazia.`,
          path: `sections[${sectionIndex}].questions[${questionIndex}].explanationSummary`,
          entityId: question.questionId,
        });
      }

      if (!question.explanationDetailed.trim()) {
        addWarningIssue({
          code: 'QUESTION_EXPLANATION_DETAILED_EMPTY',
          severity: 'warning',
          scope: 'question',
          message: `${questionLabel}: explicação detalhada está vazia.`,
          path: `sections[${sectionIndex}].questions[${questionIndex}].explanationDetailed`,
          entityId: question.questionId,
        });
      }
    });
  });

  if (questionCount === 0) {
    addBlockingIssue({
      code: 'EXAM_QUESTION_REQUIRED',
      severity: 'blocking',
      scope: 'exam',
      message: 'Estrutura: adicione ao menos uma questão.',
      path: 'sections[].questions',
    });
  }

  const validQuestionCount = Math.max(questionCount - invalidQuestionIds.size, 0);

  return {
    isPublishable: blockingErrors.length === 0,
    blockingErrors,
    warnings,
    summary: {
      blockingErrorCount: blockingErrors.length,
      warningCount: warnings.length,
      sectionCount: draft.sections.length,
      questionCount,
      validQuestionCount,
    },
  };
}
