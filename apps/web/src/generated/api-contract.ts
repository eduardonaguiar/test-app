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
  durationMinutes: number;
  passingScorePercentage: number;
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
