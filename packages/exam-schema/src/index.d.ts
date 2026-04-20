export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ExamMetadata {
  examId: string;
  title: string;
  description?: string;
  language?: string;
  tags?: string[];
}

export interface ReconnectPolicy {
  enabled: boolean;
  maxReconnects: number;
  gracePeriodSeconds: number;
  terminateIfExceeded: boolean;
}

export interface QuestionOption {
  optionId: string;
  text: string;
}

export interface ExamQuestion {
  questionId: string;
  prompt: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanationSummary: string;
  explanationDetailed: string;
  topic: string;
  difficulty: Difficulty;
  weight: number;
}

export interface ExamSection {
  sectionId: string;
  title: string;
  questions: ExamQuestion[];
}

export interface ExamDocument {
  schemaVersion: '1.0.0';
  metadata: ExamMetadata;
  durationMinutes: number;
  passingScore: number;
  reconnectPolicy: ReconnectPolicy;
  sections: ExamSection[];
}

export interface ExamSchema {
  $schema: string;
  $id: string;
  title: string;
  description: string;
}

export type ExamValidationResult =
  | { success: true; data: ExamDocument; errors: [] }
  | { success: false; errors: string[] };

export const examSchema: ExamSchema;

export function validateExamDocument(payload: unknown): ExamValidationResult;
export function isExamDocument(payload: unknown): payload is ExamDocument;
export function assertValidExamDocument(payload: unknown): ExamDocument;
