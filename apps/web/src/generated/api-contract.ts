// Auto-generated file. Do not edit manually.
// Source: contracts/openapi/exam-runner.openapi.json

export type HealthResponse = 
{
  status: string;
  timestamp: string;
  version: string;
};
export type ExamSummaryResponse = 
{
  examId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  passingScorePercentage: number;
  questionCount?: number;
};
export type ListExamsResponse = 
{
  items: ExamSummaryResponse[];
};
export type ExamSectionResponse = 
{
  sectionId: string;
  title: string;
  questionCount: number;
};
export type ExamDetailResponse = 
{
  examId: string;
  title: string;
  description: string;
  durationMinutes: number;
  passingScorePercentage: number;
  schemaVersion: string;
  sections: ExamSectionResponse[];
};
export type ProblemDetails = 
{
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
};
export type CreateAttemptRequest = 
{
  examId: string;
};
export type AttemptResponse = 
{
  attemptId: string;
  examId: string;
  status: string;
  startedAt: string;
  deadlineAt: string;
  lastSeenAt: string;
  submittedAt?: string;
};
export type AttemptExecutionQuestionOptionResponse = 
{
  optionId: string;
  optionCode: string;
  text: string;
  displayOrder: number;
};
export type AttemptExecutionQuestionResponse = 
{
  questionId: string;
  sectionId: string;
  sectionTitle: string;
  questionCode: string;
  prompt: string;
  displayOrder: number;
  selectedOptionId?: string;
  isAnswered: boolean;
  options: AttemptExecutionQuestionOptionResponse[];
};
export type SaveAttemptAnswerRequest = 
{
  selectedOptionId?: string;
};
export type AttemptExecutionStateResponse = 
{
  attemptId: string;
  examId: string;
  status: string;
  startedAt: string;
  deadlineAt: string;
  lastSeenAt: string;
  submittedAt?: string;
  remainingSeconds: number;
  answeredQuestionCount: number;
  pendingQuestionCount: number;
  questions: AttemptExecutionQuestionResponse[];
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal });

  if (!response.ok) {
    throw new Error(`GET /api/health failed with status ${response.status}`);
  }

  return parseJson<HealthResponse>(response);
}

export async function listExams(signal?: AbortSignal): Promise<ListExamsResponse> {
  const response = await fetch('/api/exams', { signal });

  if (!response.ok) {
    throw new Error(`GET /api/exams failed with status ${response.status}`);
  }

  return parseJson<ListExamsResponse>(response);
}

export async function createAttempt(payload: CreateAttemptRequest, signal?: AbortSignal): Promise<AttemptResponse> {
  const response = await fetch('/api/attempts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(`POST /api/attempts failed with status ${response.status}`);
  }

  return parseJson<AttemptResponse>(response);
}

export async function getAttemptState(attemptId: string, signal?: AbortSignal): Promise<AttemptExecutionStateResponse> {
  const response = await fetch(`/api/attempts/${attemptId}`, { signal });

  if (!response.ok) {
    throw new Error(`GET /api/attempts/${attemptId} failed with status ${response.status}`);
  }

  return parseJson<AttemptExecutionStateResponse>(response);
}

export async function saveAttemptAnswer(attemptId: string, questionId: string, payload: SaveAttemptAnswerRequest, signal?: AbortSignal): Promise<AttemptExecutionStateResponse> {
  const response = await fetch(`/api/attempts/${attemptId}/answers/${questionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    throw new Error(`PUT /api/attempts/${attemptId}/answers/${questionId} failed with status ${response.status}`);
  }

  return parseJson<AttemptExecutionStateResponse>(response);
}

export async function submitAttempt(attemptId: string, signal?: AbortSignal): Promise<AttemptResponse> {
  const response = await fetch(`/api/attempts/${attemptId}/submit`, {
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw new Error(`POST /api/attempts/${attemptId}/submit failed with status ${response.status}`);
  }

  return parseJson<AttemptResponse>(response);
}
