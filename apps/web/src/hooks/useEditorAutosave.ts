import { useEffect, useMemo, useRef, useState } from 'react';
import { saveEditorExam, type EditorExamDraft } from '../services/authoringEditor';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

type UseEditorAutosaveOptions = {
  examId?: string;
  draft: EditorExamDraft | null;
  debounceMs?: number;
  structuralDebounceMs?: number;
  onError?: (error: unknown) => void;
};

type UseEditorAutosaveResult = {
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  errorMessage: string | null;
};

function getStorageKey(examId: string) {
  return `authoring-editor:${examId}`;
}

function getStructuralSignature(draft: EditorExamDraft): string {
  return JSON.stringify({
    status: draft.status,
    sectionOrder: draft.sections.map((section) => section.sectionId),
    sections: draft.sections.map((section) => ({
      id: section.sectionId,
      questionOrder: section.questions.map((question) => question.questionId),
      questions: section.questions.map((question) => ({
        id: question.questionId,
        optionIds: question.options.map((option) => option.optionId),
        correctOptionId: question.correctOptionId,
      })),
    })),
  });
}

export function useEditorAutosave({
  examId,
  draft,
  debounceMs = 800,
  structuralDebounceMs = 200,
  onError,
}: UseEditorAutosaveOptions): UseEditorAutosaveResult {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasInitializedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const latestDraftJsonRef = useRef<string>('');
  const lastSavedJsonRef = useRef<string>('');
  const lastStructuralSignatureRef = useRef<string>('');
  const requestSequenceRef = useRef(0);
  const latestRequestStartedRef = useRef(0);

  const draftJson = useMemo(() => (draft ? JSON.stringify(draft) : ''), [draft]);
  const structuralSignature = useMemo(() => (draft ? getStructuralSignature(draft) : ''), [draft]);

  useEffect(() => {
    if (!draft) {
      hasInitializedRef.current = false;
      latestDraftJsonRef.current = '';
      lastSavedJsonRef.current = '';
      lastStructuralSignatureRef.current = '';
      setSaveStatus('idle');
      setLastSavedAt(null);
      setErrorMessage(null);
      return;
    }

    latestDraftJsonRef.current = draftJson;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      lastSavedJsonRef.current = draftJson;
      lastStructuralSignatureRef.current = structuralSignature;
      setSaveStatus('idle');
      return;
    }

    if (draftJson === lastSavedJsonRef.current) {
      setSaveStatus('idle');
      return;
    }

    const nextDelay =
      structuralSignature !== lastStructuralSignatureRef.current ? structuralDebounceMs : debounceMs;
    lastStructuralSignatureRef.current = structuralSignature;
    setSaveStatus('dirty');
    setErrorMessage(null);

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        const snapshot = draft;
        const snapshotJson = JSON.stringify(snapshot);
        const key = getStorageKey(snapshot.examId || 'new');
        localStorage.setItem(key, snapshotJson);
        setSaveStatus('saving');

        if (!examId || examId === 'new') {
          lastSavedJsonRef.current = snapshotJson;
          setLastSavedAt(new Date());
          setSaveStatus('saved');
          return;
        }

        const requestId = requestSequenceRef.current + 1;
        requestSequenceRef.current = requestId;
        latestRequestStartedRef.current = requestId;

        try {
          await saveEditorExam(snapshot);

          if (requestId !== latestRequestStartedRef.current) {
            return;
          }

          lastSavedJsonRef.current = snapshotJson;
          setLastSavedAt(new Date());
          setSaveStatus(snapshotJson === latestDraftJsonRef.current ? 'saved' : 'dirty');
        } catch (error) {
          if (requestId !== latestRequestStartedRef.current) {
            return;
          }

          setSaveStatus('error');
          setErrorMessage('Não foi possível salvar o rascunho agora.');
          onError?.(error);
        }
      })();
    }, nextDelay);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [debounceMs, draft, draftJson, examId, onError, structuralDebounceMs, structuralSignature]);

  return {
    saveStatus,
    lastSavedAt,
    errorMessage,
  };
}
