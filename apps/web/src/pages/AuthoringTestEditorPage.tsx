import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
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

type SaveState = 'saved' | 'saving' | 'error';

function countQuestions(draft: EditorExamDraft): number {
  return draft.sections.reduce((total, section) => total + section.questions.length, 0);
}

function buildValidation(
  draft: EditorExamDraft,
  metadataValidation: ReturnType<typeof validateGeneralMetadata>,
): { errors: string[]; warnings: string[] } {
  const errors = [...metadataValidation.errors];
  const warnings = [...metadataValidation.warnings];

  if (draft.sections.length === 0) {
    errors.push('Adicione ao menos uma seção.');
  }

  let untitledSections = 0;
  let sectionsWithoutQuestions = 0;
  let questionsWithoutPrompt = 0;
  let questionsWithoutOptions = 0;
  let questionsWithoutCorrectOption = 0;

  draft.sections.forEach((section) => {
    if (!section.title.trim()) {
      untitledSections += 1;
    }

    if (section.questions.length === 0) {
      sectionsWithoutQuestions += 1;
    }

    section.questions.forEach((question) => {
      if (!question.prompt.trim()) {
        questionsWithoutPrompt += 1;
      }

      const validOptions = question.options.filter((option) => option.text.trim().length > 0);
      if (validOptions.length < 2) {
        questionsWithoutOptions += 1;
      }

      if (!question.options.some((option) => option.optionId === question.correctOptionId)) {
        questionsWithoutCorrectOption += 1;
      }
    });
  });

  if (untitledSections > 0) {
    errors.push(`${untitledSections} seção(ões) sem título.`);
  }

  if (questionsWithoutPrompt > 0) {
    errors.push(`${questionsWithoutPrompt} questão(ões) sem enunciado.`);
  }

  if (questionsWithoutOptions > 0) {
    errors.push(`${questionsWithoutOptions} questão(ões) com menos de 2 alternativas válidas.`);
  }

  if (questionsWithoutCorrectOption > 0) {
    errors.push(`${questionsWithoutCorrectOption} questão(ões) sem resposta correta válida.`);
  }

  const questionsWithoutExplanations = draft.sections.reduce(
    (total, section) =>
      total +
      section.questions.filter((question) => !question.explanationSummary.trim() || !question.explanationDetailed.trim()).length,
    0,
  );

  const questionsWithoutTopic = draft.sections.reduce(
    (total, section) => total + section.questions.filter((question) => !question.topic?.trim()).length,
    0,
  );

  if (sectionsWithoutQuestions > 0) {
    warnings.push(`${sectionsWithoutQuestions} seção(ões) ainda sem questões.`);
  }

  if (questionsWithoutExplanations > 0) {
    warnings.push(`${questionsWithoutExplanations} questão(ões) sem explicação completa.`);
  }

  if (questionsWithoutTopic > 0) {
    warnings.push(`${questionsWithoutTopic} questão(ões) sem tópico definido.`);
  }

  return { errors, warnings };
}

function getTabState(activeTab: EditorTabKey, errors: string[]): Array<{ key: EditorTabKey; label: string; state: 'complete' | 'incomplete' | 'error' }> {
  const hasErrors = errors.length > 0;

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
  const validation = useMemo(
    () => (draft && generalValidation ? buildValidation(draft, generalValidation) : { errors: [], warnings: [] }),
    [draft, generalValidation],
  );

  if (isLoading) {
    return <PageLoading title="Abrindo editor" description="Carregando estrutura da prova para edição." />;
  }

  if (errorMessage || !draft) {
    return <InlineError title="Falha ao carregar editor" description={errorMessage ?? 'Não foi possível abrir o editor.'} />;
  }

  const questionCount = countQuestions(draft);
  const canPublish = validation.errors.length === 0;

  return (
    <EditorShell
      header={
        <EditorHeader
          title={draft.title}
          status={draft.status}
          saveState={saveState}
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
      tabs={<EditorTabs activeTab={activeTab} onChange={setActiveTab} items={getTabState(activeTab, validation.errors)} />}
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
            <section className="editor-review">
              <h2>Revisão editorial</h2>
              <p>Valide os pontos críticos antes da publicação.</p>
              <ul>
                {validation.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
              {validation.errors.length === 0 ? <p>Tudo pronto para publicar.</p> : null}
            </section>
          ) : null}
        </>
      }
      sidebar={
        <EditorSidebar
          status={draft.status}
          sectionCount={draft.sections.length}
          questionCount={questionCount}
          errors={validation.errors}
          warnings={validation.warnings}
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
