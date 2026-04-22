export type EditorExamQuestion = {
  questionId: string;
  prompt: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  weight: number;
  options: Array<{
    optionId: string;
    text: string;
  }>;
  correctOptionId: string;
  explanationSummary: string;
  explanationDetailed: string;
};

export type EditorExamSection = {
  sectionId: string;
  title: string;
  description?: string | null;
  displayOrder: number;
  questions: EditorExamQuestion[];
};

export type EditorExamDraft = {
  examId: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  durationMinutes: number;
  passingScorePercentage: number;
  reconnectPolicy: {
    enabled: boolean;
    maxReconnectAttempts: number;
    gracePeriodSeconds: number;
    terminateIfExceeded: boolean;
  };
  sections: EditorExamSection[];
};

type ExamDetailApiResponse = {
  examId: string;
  title: string;
  description: string;
  status?: 'draft' | 'published';
  durationMinutes: number;
  passingScorePercentage: number;
  reconnectPolicy?: {
    enabled?: boolean;
    maxReconnectAttempts?: number;
    gracePeriodSeconds?: number;
    terminateIfExceeded?: boolean;
  };
  sections: Array<{
    sectionId: string;
    title: string;
    description?: string | null;
    displayOrder: number;
    questions: Array<{
      questionId: string;
      prompt: string;
      topic?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      weight?: number;
      options: Array<{
        optionId: string;
        text: string;
      }>;
      correctOptionId?: string;
      explanationSummary?: string;
      explanationDetailed?: string;
    }>;
  }>;
};

function normalizeReconnectPolicy(policy: ExamDetailApiResponse['reconnectPolicy']) {
  return {
    enabled: policy?.enabled ?? true,
    maxReconnectAttempts: policy?.maxReconnectAttempts ?? 3,
    gracePeriodSeconds: policy?.gracePeriodSeconds ?? 60,
    terminateIfExceeded: policy?.terminateIfExceeded ?? true,
  };
}

export async function getEditorExam(examId: string, signal?: AbortSignal): Promise<EditorExamDraft> {
  const detailResponse = await fetch(`/api/exams/${examId}`, { signal });

  if (!detailResponse.ok) {
    throw new Error(`GET /api/exams/${examId} failed with status ${detailResponse.status}`);
  }

  const detail = (await detailResponse.json()) as ExamDetailApiResponse;

  return {
    examId: detail.examId,
    title: detail.title,
    description: detail.description,
    status: detail.status ?? 'draft',
    durationMinutes: detail.durationMinutes,
    passingScorePercentage: detail.passingScorePercentage,
    reconnectPolicy: normalizeReconnectPolicy(detail.reconnectPolicy),
    sections: detail.sections.map((section) => ({
      sectionId: section.sectionId,
      title: section.title,
      description: section.description ?? null,
      displayOrder: section.displayOrder,
      questions: section.questions.map((question) => ({
        questionId: question.questionId,
        prompt: question.prompt,
        options: question.options,
        topic: question.topic?.trim() || undefined,
        difficulty: question.difficulty,
        weight: question.weight ?? 1,
        correctOptionId: question.correctOptionId ?? question.options[0]?.optionId ?? '',
        explanationSummary: question.explanationSummary ?? '',
        explanationDetailed: question.explanationDetailed ?? '',
      })),
    })),
  };
}

export async function saveEditorExam(draft: EditorExamDraft, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`/api/exams/${draft.examId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
    signal,
  });

  if (!response.ok) {
    throw new Error(`PUT /api/exams/${draft.examId} failed with status ${response.status}`);
  }
}

type PublishApiIssue = {
  code: string;
  severity: 'blocking' | 'warning';
  scope: 'exam' | 'section' | 'question';
  message: string;
  path?: string;
  entityId?: string;
};

type PublishExamApiResponse = {
  examId: string;
  status: 'draft' | 'published';
  publishedAt: string;
  validation: {
    isPublishable: boolean;
    summary: {
      blockingErrorCount: number;
      warningCount: number;
      sectionCount: number;
      questionCount: number;
      validQuestionCount: number;
    };
    blockingErrors: PublishApiIssue[];
    warnings: PublishApiIssue[];
  };
};

export type PublishExamResult = {
  examId: string;
  status: 'draft' | 'published';
  publishedAt: string;
  validation: PublishExamApiResponse['validation'];
};

export async function publishEditorExam(examId: string, signal?: AbortSignal): Promise<PublishExamResult> {
  const response = await fetch(`/api/authoring/exams/${examId}/publish`, {
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(problem?.detail ?? `POST /api/authoring/exams/${examId}/publish failed with status ${response.status}`);
  }

  const payload = (await response.json()) as PublishExamApiResponse;

  return {
    examId: payload.examId,
    status: payload.status,
    publishedAt: payload.publishedAt,
    validation: payload.validation,
  };
}

export function createEmptyEditorQuestion(): EditorExamQuestion {
  const firstOptionId = crypto.randomUUID();
  return {
    questionId: crypto.randomUUID(),
    prompt: '',
    topic: '',
    difficulty: 'medium',
    weight: 1,
    options: [
      { optionId: firstOptionId, text: '' },
      { optionId: crypto.randomUUID(), text: '' },
    ],
    correctOptionId: firstOptionId,
    explanationSummary: '',
    explanationDetailed: '',
  };
}

export function createEmptyEditorExam(): EditorExamDraft {
  return {
    examId: 'new',
    title: 'Novo teste',
    description: '',
    status: 'draft',
    durationMinutes: 60,
    passingScorePercentage: 70,
    reconnectPolicy: {
      enabled: true,
      maxReconnectAttempts: 3,
      gracePeriodSeconds: 60,
      terminateIfExceeded: true,
    },
    sections: [
      {
        sectionId: crypto.randomUUID(),
        title: 'Seção 1',
        description: 'Bloco inicial da prova.',
        displayOrder: 1,
        questions: [createEmptyEditorQuestion()],
      },
    ],
  };
}
