import type { EditorExamDraft } from './authoringEditor';
import type { EditorialValidationResult } from './editorialValidation';

const EXPORT_SCHEMA_VERSION = '1.0.0' as const;

type ExportedQuestionOption = {
  optionId: string;
  text: string;
};

type ExportedQuestion = {
  questionId: string;
  prompt: string;
  options: ExportedQuestionOption[];
  correctOptionId: string;
  explanationSummary: string;
  explanationDetailed: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  weight: number;
};

type ExportedSection = {
  sectionId: string;
  title: string;
  questions: ExportedQuestion[];
};

export type ExportedExamJson = {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  metadata: {
    examId: string;
    title: string;
    description?: string;
  };
  durationMinutes: number;
  passingScore: number;
  reconnectPolicy: {
    enabled: boolean;
    maxReconnects: number;
    gracePeriodSeconds: number;
    terminateIfExceeded: boolean;
  };
  sections: ExportedSection[];
};

export type ExportCompatibilityResult = {
  isCompatible: boolean;
  reasons: string[];
};

export class ExamExportCompatibilityError extends Error {
  readonly reasons: string[];

  constructor(reasons: string[]) {
    super('Não foi possível exportar a prova porque existem erros impeditivos de compatibilidade.');
    this.name = 'ExamExportCompatibilityError';
    this.reasons = reasons;
  }
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function toNonEmptyTrimmed(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function buildExportFileName(draft: EditorExamDraft): string {
  const examId = draft.examId.trim();

  if (examId && examId !== 'new') {
    return `${slugify(examId) || 'exam'}.json`;
  }

  const titleSlug = slugify(draft.title.trim());
  return `${titleSlug || 'prova'}.json`;
}

export function validateExamExportCompatibility(
  draft: EditorExamDraft,
  editorialValidation: EditorialValidationResult,
): ExportCompatibilityResult {
  const reasons: string[] = [];

  if (editorialValidation.summary.blockingErrorCount > 0) {
    reasons.push(`Corrija os ${editorialValidation.summary.blockingErrorCount} erro(s) impeditivo(s) antes de exportar.`);
  }

  draft.sections.forEach((section, sectionIndex) => {
    section.questions.forEach((question, questionIndex) => {
      const label = `Seção ${sectionIndex + 1}, questão ${questionIndex + 1}`;

      if (!toNonEmptyTrimmed(question.topic)) {
        reasons.push(`${label}: informe o tópico para compatibilidade com o schema.`);
      }

      if (!question.difficulty) {
        reasons.push(`${label}: informe a dificuldade para compatibilidade com o schema.`);
      }

      if (!toNonEmptyTrimmed(question.explanationSummary)) {
        reasons.push(`${label}: resumo da explicação é obrigatório para exportação.`);
      }

      if (!toNonEmptyTrimmed(question.explanationDetailed)) {
        reasons.push(`${label}: explicação detalhada é obrigatória para exportação.`);
      }
    });
  });

  return {
    isCompatible: reasons.length === 0,
    reasons,
  };
}

export function toExamImportJson(draft: EditorExamDraft): ExportedExamJson {
  const description = toNonEmptyTrimmed(draft.description);

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    metadata: {
      examId: draft.examId.trim(),
      title: draft.title.trim(),
      ...(description ? { description } : {}),
    },
    durationMinutes: draft.durationMinutes,
    passingScore: draft.passingScorePercentage,
    reconnectPolicy: {
      enabled: draft.reconnectPolicy.enabled,
      maxReconnects: draft.reconnectPolicy.maxReconnectAttempts,
      gracePeriodSeconds: draft.reconnectPolicy.gracePeriodSeconds,
      terminateIfExceeded: draft.reconnectPolicy.terminateIfExceeded,
    },
    sections: draft.sections.map((section) => ({
      sectionId: section.sectionId,
      title: section.title.trim(),
      questions: section.questions.map((question) => ({
        questionId: question.questionId,
        prompt: question.prompt.trim(),
        topic: question.topic?.trim() ?? '',
        difficulty: question.difficulty ?? 'medium',
        weight: question.weight,
        options: question.options.map((option) => ({
          optionId: option.optionId,
          text: option.text.trim(),
        })),
        correctOptionId: question.correctOptionId,
        explanationSummary: question.explanationSummary.trim(),
        explanationDetailed: question.explanationDetailed.trim(),
      })),
    })),
  };
}

export function exportExamToJsonFile(
  draft: EditorExamDraft,
  editorialValidation: EditorialValidationResult,
): string {
  const compatibility = validateExamExportCompatibility(draft, editorialValidation);

  if (!compatibility.isCompatible) {
    throw new ExamExportCompatibilityError(compatibility.reasons);
  }

  const payload = toExamImportJson(draft);
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  const fileName = buildExportFileName(draft);

  const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';

  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return fileName;
}
