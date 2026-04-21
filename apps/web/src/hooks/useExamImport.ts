import { useState } from 'react';
import { importExam, ImportExamApiError, type ImportExamFailure, type ImportExamSuccess } from '../services/examImport';

type UseExamImportResult = {
  isSubmitting: boolean;
  successResult: ImportExamSuccess | null;
  failure: ImportExamFailure | null;
  submitImport: (payload: unknown) => Promise<void>;
  reset: () => void;
};

export function useExamImport(): UseExamImportResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<ImportExamSuccess | null>(null);
  const [failure, setFailure] = useState<ImportExamFailure | null>(null);

  async function submitImport(payload: unknown) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFailure(null);
    setSuccessResult(null);

    try {
      const response = await importExam(payload);
      setSuccessResult(response);
    } catch (error) {
      if (error instanceof ImportExamApiError) {
        setFailure(error.failure);
      } else {
        setFailure({
          kind: 'technical',
          message: 'Erro inesperado ao importar prova.',
          validationErrors: [],
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    setFailure(null);
    setSuccessResult(null);
  }

  return {
    isSubmitting,
    successResult,
    failure,
    submitImport,
    reset,
  };
}
