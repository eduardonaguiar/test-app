export type ImportExamSuccess = {
  examId: string;
  title: string;
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
    throw new ImportExamApiError({
      kind: 'technical',
      message: 'Não foi possível conectar com a API para importar a prova.',
      validationErrors: [],
    });
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
