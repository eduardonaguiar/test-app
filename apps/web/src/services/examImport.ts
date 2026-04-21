export type ImportExamSuccess = {
  examId: string;
  title: string;
  sectionCount: number;
  questionCount: number;
};

export type ImportedExamSummary = {
  examId: string;
  title: string;
  description: string;
  durationMinutes: number;
  passingScorePercentage: number;
  schemaVersion: string;
  sectionCount: number;
  questionCount: number;
};

export type ImportValidationError = {
  path: string;
  message: string;
};

export type ImportExamFailureKind = 'validation' | 'technical';

export type ImportExamFailure = {
  kind: ImportExamFailureKind;
  message: string;
  validationErrors: ImportValidationError[];
};

export class ImportExamApiError extends Error {
  readonly failure: ImportExamFailure;

  constructor(failure: ImportExamFailure) {
    super(failure.message);
    this.name = 'ImportExamApiError';
    this.failure = failure;
  }
}

type ProblemDetailsPayload = {
  title?: string;
  detail?: string;
  status?: number;
  code?: unknown;
  errors?: unknown;
};

type ExamDetailPayload = {
  examId?: unknown;
  title?: unknown;
  description?: unknown;
  durationMinutes?: unknown;
  passingScorePercentage?: unknown;
  schemaVersion?: unknown;
  sectionCount?: unknown;
  questionCount?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseValidationErrors(payload: unknown): ImportValidationError[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((entry): ImportValidationError | null => {
      if (!isRecord(entry)) {
        return null;
      }

      const path = entry.path;
      const message = entry.message;

      if (typeof path !== 'string' || typeof message !== 'string') {
        return null;
      }

      return { path, message };
    })
    .filter((entry): entry is ImportValidationError => entry !== null);
}

function toFailure(responsePayload: unknown, status: number): ImportExamFailure {
  if (!isRecord(responsePayload)) {
    return {
      kind: 'technical',
      message: `A importação falhou com status ${status}.`,
      validationErrors: [],
    };
  }

  const problem = responsePayload as ProblemDetailsPayload;
  const validationErrors = parseValidationErrors(problem.errors);
  const code = typeof problem.code === 'string' ? problem.code : null;
  const detail = typeof problem.detail === 'string' ? problem.detail : null;
  const title = typeof problem.title === 'string' ? problem.title : null;

  if (code === 'validation_failed' || code === 'import_inconsistent_payload' || validationErrors.length > 0) {
    return {
      kind: 'validation',
      message: detail ?? title ?? 'O arquivo JSON é inválido para importação.',
      validationErrors,
    };
  }

  return {
    kind: 'technical',
    message: detail ?? title ?? `A importação falhou com status ${status}.`,
    validationErrors: [],
  };
}

function toTechnicalFailure(message: string): ImportExamFailure {
  return {
    kind: 'technical',
    message,
    validationErrors: [],
  };
}

export async function importExam(payload: unknown, signal?: AbortSignal): Promise<ImportExamSuccess> {
  let response: Response;

  try {
    response = await fetch('/api/exams/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    throw new ImportExamApiError(toTechnicalFailure('Não foi possível conectar com a API para importar a prova.'));
  }

  if (!response.ok) {
    let responsePayload: unknown = null;

    try {
      responsePayload = await response.json();
    } catch {
      responsePayload = null;
    }

    throw new ImportExamApiError(toFailure(responsePayload, response.status));
  }

  const successPayload = (await response.json()) as ImportExamSuccess;
  return successPayload;
}

export async function fetchImportedExamSummary(examId: string, signal?: AbortSignal): Promise<ImportedExamSummary> {
  let response: Response;

  try {
    response = await fetch(`/api/exams/${examId}`, { signal });
  } catch {
    throw new ImportExamApiError(toTechnicalFailure('A prova foi importada, mas não foi possível carregar o resumo completo.'));
  }

  if (!response.ok) {
    throw new ImportExamApiError(
      toTechnicalFailure(`A prova foi importada, mas o resumo retornou status ${response.status}.`),
    );
  }

  const payload = (await response.json()) as ExamDetailPayload;

  if (
    typeof payload.examId !== 'string' ||
    typeof payload.title !== 'string' ||
    typeof payload.description !== 'string' ||
    typeof payload.durationMinutes !== 'number' ||
    typeof payload.passingScorePercentage !== 'number' ||
    typeof payload.schemaVersion !== 'string' ||
    typeof payload.sectionCount !== 'number' ||
    typeof payload.questionCount !== 'number'
  ) {
    throw new ImportExamApiError(toTechnicalFailure('A prova foi importada, mas o resumo retornou em formato inesperado.'));
  }

  return {
    examId: payload.examId,
    title: payload.title,
    description: payload.description,
    durationMinutes: payload.durationMinutes,
    passingScorePercentage: payload.passingScorePercentage,
    schemaVersion: payload.schemaVersion,
    sectionCount: payload.sectionCount,
    questionCount: payload.questionCount,
  };
}
