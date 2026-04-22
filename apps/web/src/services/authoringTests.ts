export type AuthoringTestSummary = {
  examId: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  questionCount: number;
  sectionCount: number;
  updatedAt?: string | null;
};

type ListAuthoringTestsResponse = {
  items: AuthoringTestSummary[];
};

export async function listAuthoringTests(signal?: AbortSignal): Promise<ListAuthoringTestsResponse> {
  const response = await fetch('/api/exams/authoring', { signal });

  if (!response.ok) {
    throw new Error(`GET /api/exams/authoring failed with status ${response.status}`);
  }

  return (await response.json()) as ListAuthoringTestsResponse;
}
