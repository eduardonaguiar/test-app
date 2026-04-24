import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useEditorAutosave } from '../hooks/useEditorAutosave';
import {
  createEmptyEditorExam,
  getEditorExam,
  publishEditorExam,
  type EditorExamDraft,
} from '../services/authoringEditor';
import { validateExamEditorialState } from '../services/editorialValidation';
import {
  ExamExportCompatibilityError,
  exportExamToJsonFile,
  validateExamExportCompatibility,
} from '../services/examJsonExport';

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
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<EditorTabKey>('general');
  const [draft, setDraft] = useState<EditorExamDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const handleAutosaveError = useCallback(() => {
    toast.error({
      title: 'Falha no autosave',
      description: 'As mudanças permanecem no navegador e serão reenviadas no próximo autosave.',
    });
  }, [toast]);

  const { saveStatus, lastSavedAt, errorMessage: autosaveErrorMessage } = useEditorAutosave({
    examId,
    draft,
    debounceMs: 800,
    structuralDebounceMs: 200,
    onError: handleAutosaveError,
  });

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(null);

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

  const generalValidation = useMemo(() => (draft ? validateGeneralMetadata(draft) : null), [draft]);
  const editorialValidation = useMemo(() => (draft ? validateExamEditorialState(draft) : null), [draft]);
  const exportCompatibility = useMemo(
    () => (draft && editorialValidation ? validateExamExportCompatibility(draft, editorialValidation) : null),
    [draft, editorialValidation],
  );

  if (isLoading) {
    return <PageLoading title="Abrindo editor" description="Carregando estrutura da prova para edição." />;
  }

  if (errorMessage || !draft) {
    return <InlineError title="Falha ao carregar editor" description={errorMessage ?? 'Não foi possível abrir o editor.'} />;
  }

  const questionCount = countQuestions(draft);
  const canPublish = editorialValidation?.isPublishable ?? false;
  const isAlreadyPublished = draft.status === 'published';
  const publishDisabled = !canPublish || isAlreadyPublished || isPublishing || draft.examId === 'new';
  const publishBlockedReason = draft.examId === 'new'
    ? 'Salve e importe a prova para publicar.'
      : !canPublish
      ? 'Corrija os erros impeditivos para publicar.'
      : undefined;
  const exportJsonDisabled = !(exportCompatibility?.isCompatible ?? false);
  const exportJsonBlockedReason = exportCompatibility?.reasons[0] ?? 'Corrija os erros impeditivos para exportar JSON compatível.';

  async function handleConfirmPublish() {
    const currentDraft = draft;
    if (publishDisabled || !currentDraft) {
      return;
    }

    setIsPublishing(true);

    try {
      const result = await publishEditorExam(currentDraft.examId);
      setDraft((current) =>
        current
          ? {
              ...current,
              status: result.status,
            }
          : current,
      );

      toast.success({
        title: 'Prova publicada com sucesso',
        description: 'A prova agora aparece no catálogo de simulados disponíveis para realização.',
      });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Não foi possível publicar a prova no momento.';
      toast.error({
        title: 'Falha ao publicar prova',
        description,
      });
    } finally {
      setIsPublishing(false);
    }
  }

  function handlePreview() {
    const currentDraft = draft;
    if (!currentDraft) {
      return;
    }

    navigate(`/authoring/tests/${currentDraft.examId}/preview`, {
      state: {
        draft: currentDraft,
      },
    });
  }

  function handleExportJson() {
    const currentDraft = draft;
    if (!editorialValidation || !currentDraft) {
      return;
    }

    try {
      const fileName = exportExamToJsonFile(currentDraft, editorialValidation);
      toast.success({
        title: 'JSON exportado com sucesso',
        description: `Arquivo ${fileName} gerado com o schema oficial atual.`,
      });
    } catch (error) {
      if (error instanceof ExamExportCompatibilityError) {
        toast.error({
          title: 'Não foi possível exportar a prova',
          description: error.reasons[0] ?? 'Ainda existem erros impeditivos de compatibilidade no editor.',
        });
        return;
      }

      toast.error({
        title: 'Falha ao gerar arquivo',
        description: 'Tente novamente após revisar os dados da prova.',
      });
    }
  }

  return (
    <EditorShell
      header={
        <EditorHeader
          title={draft.title}
          status={draft.status}
          saveState={saveStatus}
          lastSavedAt={lastSavedAt}
          saveErrorMessage={autosaveErrorMessage}
          warningCount={editorialValidation?.summary.warningCount ?? 0}
          sectionCount={editorialValidation?.summary.sectionCount ?? 0}
          questionCount={editorialValidation?.summary.questionCount ?? 0}
          blockingErrorCount={editorialValidation?.summary.blockingErrorCount ?? 0}
          onPreview={handlePreview}
          onExportJson={handleExportJson}
          exportJsonDisabled={exportJsonDisabled}
          exportJsonBlockedReason={exportJsonBlockedReason}
          onPublish={handleConfirmPublish}
          publishDisabled={publishDisabled}
          publishBlockedReason={publishBlockedReason}
          isPublished={isAlreadyPublished}
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
            void handleConfirmPublish();
          }}
          publishDisabled={publishDisabled}
          publishBlockedReason={publishBlockedReason}
        />
      }
    />
  );
}
