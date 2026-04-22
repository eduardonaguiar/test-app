import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EditorialConsistencyPanel } from '../components/editor/EditorialConsistencyPanel';
import { EditorHeader } from '../components/editor/EditorHeader';
import { EditorShell } from '../components/editor/EditorShell';
import { EditorSidebar } from '../components/editor/EditorSidebar';
import { EditorTabs, type EditorTabKey } from '../components/editor/EditorTabs';
import { QuestionList } from '../components/editor/QuestionList';
import { SectionsEditor } from '../components/editor/SectionsEditor';
import { TestGeneralForm } from '../components/editor/TestGeneralForm';
import { validateGeneralMetadata } from '../components/editor/generalMetadataValidation';
import { InlineError } from '../components/feedback/InlineError';
import { PageLoading } from '../components/feedback/PageLoading';
import { useToast } from '../hooks/useToast';
import {
  createEmptyEditorExam,
  getEditorExam,
  saveEditorExam,
  type EditorExamDraft,
} from '../services/authoringEditor';
import { validateExamEditorialState } from '../services/editorialValidation';

type SaveState = 'saved' | 'saving' | 'error';

function countQuestions(draft: EditorExamDraft): number {
  return draft.sections.reduce((total, section) => total + section.questions.length, 0);
}
function getTabState(activeTab: EditorTabKey, hasBlockingErrors: boolean): Array<{ key: EditorTabKey; label: string; state: 'complete' | 'incomplete' | 'error' }> {
  const hasErrors = hasBlockingErrors;

  return [
    { key: 'general', label: 'Geral', state: hasErrors && activeTab === 'general' ? 'error' : 'complete' },
    { key: 'sections', label: 'Seções', state: hasErrors && activeTab === 'sections' ? 'error' : 'incomplete' },
    { key: 'questions', label: 'Questões', state: hasErrors && activeTab === 'questions' ? 'error' : 'incomplete' },
    { key: 'review', label: 'Revisão', state: hasErrors ? 'error' : 'complete' },
  ];
}

function getStorageKey(examId: string) {
  return `authoring-editor:${examId}`;
}

export function AuthoringTestEditorPage() {
  const { examId } = useParams<{ examId: string }>();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<EditorTabKey>('general');
  const [draft, setDraft] = useState<EditorExamDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const saveTimerRef = useRef<number | null>(null);
  const hasDraftInitializedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(null);
    hasDraftInitializedRef.current = false;

    async function loadDraft() {
      if (!examId || examId === 'new') {
        setDraft(createEmptyEditorExam());
        setIsLoading(false);
        return;
      }

      const localDraft = localStorage.getItem(getStorageKey(examId));
      if (localDraft) {
        setDraft(JSON.parse(localDraft) as EditorExamDraft);
        setIsLoading(false);
        return;
      }

      const fetchedDraft = await getEditorExam(examId, controller.signal);
      setDraft(fetchedDraft);
      setIsLoading(false);
    }

    loadDraft().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Não foi possível carregar o editor deste teste agora.');
      setIsLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, [examId]);

  useEffect(() => {
    if (!draft) {
      return;
    }

    if (!hasDraftInitializedRef.current) {
      hasDraftInitializedRef.current = true;
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    setSaveState('saving');

    saveTimerRef.current = window.setTimeout(async () => {
      const key = getStorageKey(draft.examId || 'new');
      localStorage.setItem(key, JSON.stringify(draft));

      if (!examId || examId === 'new') {
        setSaveState('saved');
        return;
      }

      setSaveState('saving');

      try {
        await saveEditorExam(draft);
        setSaveState('saved');
      } catch {
        setSaveState('error');
        toast.error({
          title: 'Falha no autosave',
          description: 'As mudanças permanecem no navegador e serão reenviadas no próximo autosave.',
        });
      }
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [draft, examId, toast]);

  const generalValidation = useMemo(() => (draft ? validateGeneralMetadata(draft) : null), [draft]);
  const editorialValidation = useMemo(() => (draft ? validateExamEditorialState(draft) : null), [draft]);

  if (isLoading) {
    return <PageLoading title="Abrindo editor" description="Carregando estrutura da prova para edição." />;
  }

  if (errorMessage || !draft) {
    return <InlineError title="Falha ao carregar editor" description={errorMessage ?? 'Não foi possível abrir o editor.'} />;
  }

  const questionCount = countQuestions(draft);
  const canPublish = editorialValidation?.isPublishable ?? false;

  return (
    <EditorShell
      header={
        <EditorHeader
          title={draft.title}
          status={draft.status}
          saveState={saveState}
          warningCount={editorialValidation?.summary.warningCount ?? 0}
          onPublish={() => {
            if (!canPublish) {
              return;
            }

            setDraft((current) => (current ? { ...current, status: 'published' } : current));
            toast.success({ title: 'Teste publicado', description: 'A prova foi marcada como publicada no ambiente de autoria.' });
          }}
          publishDisabled={!canPublish}
        />
      }
      tabs={
        <EditorTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          items={getTabState(activeTab, (editorialValidation?.summary.blockingErrorCount ?? 0) > 0)}
        />
      }
      main={
        <>
          {activeTab === 'general' ? (
            <TestGeneralForm
              draft={draft}
              fieldErrors={generalValidation?.fieldErrors ?? {}}
              onChange={(nextDraft) => setDraft(nextDraft)}
            />
          ) : null}

          {activeTab === 'sections' ? (
            <SectionsEditor
              sections={draft.sections}
              onAddSection={(payload) =>
                setDraft((current) => {
                  if (!current) {
                    return current;
                  }

                  const nextDisplayOrder =
                    current.sections.reduce((maxOrder, section) => Math.max(maxOrder, section.displayOrder), 0) + 1;

                  return {
                    ...current,
                    sections: [
                      ...current.sections,
                      {
                        sectionId: crypto.randomUUID(),
                        title: payload.title,
                        description: payload.description,
                        displayOrder: nextDisplayOrder,
                        questions: [],
                      },
                    ],
                  };
                })
              }
              onUpdateSection={(sectionId, payload) =>
                setDraft((current) => {
                  if (!current) {
                    return current;
                  }

                  return {
                    ...current,
                    sections: current.sections.map((section) =>
                      section.sectionId === sectionId
                        ? { ...section, title: payload.title, description: payload.description }
                        : section,
                    ),
                  };
                })
              }
              onRemoveSection={(sectionId) =>
                setDraft((current) => {
                  if (!current) {
                    return current;
                  }

                  return {
                    ...current,
                    sections: current.sections
                      .filter((section) => section.sectionId !== sectionId)
                      .map((section, index) => ({ ...section, displayOrder: index + 1 })),
                  };
                })
              }
            />
          ) : null}

          {activeTab === 'questions' ? (
            <QuestionList
              sections={draft.sections}
              onAddQuestion={(sectionId, question) =>
                setDraft((current) => {
                  if (!current) {
                    return current;
                  }

                  return {
                    ...current,
                    sections: current.sections.map((section) =>
                      section.sectionId === sectionId ? { ...section, questions: [...section.questions, question] } : section,
                    ),
                  };
                })
              }
              onUpdateQuestion={(sectionId, question) =>
                setDraft((current) => {
                  if (!current) {
                    return current;
                  }

                  return {
                    ...current,
                    sections: current.sections.map((section) =>
                      section.sectionId === sectionId
                        ? {
                            ...section,
                            questions: section.questions.map((existingQuestion) =>
                              existingQuestion.questionId === question.questionId ? question : existingQuestion,
                            ),
                          }
                        : section,
                    ),
                  };
                })
              }
              onRemoveQuestion={(sectionId, questionId) =>
                setDraft((current) => {
                  if (!current) {
                    return current;
                  }

                  return {
                    ...current,
                    sections: current.sections.map((section) =>
                      section.sectionId === sectionId
                        ? {
                            ...section,
                            questions: section.questions.filter((question) => question.questionId !== questionId),
                          }
                        : section,
                    ),
                  };
                })
              }
            />
          ) : null}

          {activeTab === 'review' ? (
            editorialValidation ? <EditorialConsistencyPanel validation={editorialValidation} /> : null
          ) : null}
        </>
      }
      sidebar={
        <EditorSidebar
          status={draft.status}
          validation={
            editorialValidation ?? {
              isPublishable: false,
              blockingErrors: [],
              warnings: [],
              summary: {
                blockingErrorCount: 0,
                warningCount: 0,
                sectionCount: draft.sections.length,
                questionCount,
                validQuestionCount: 0,
              },
            }
          }
          onPublish={() => {
            if (!canPublish) {
              return;
            }

            setDraft((current) => (current ? { ...current, status: 'published' } : current));
          }}
          publishDisabled={!canPublish}
        />
      }
    />
  );
}
