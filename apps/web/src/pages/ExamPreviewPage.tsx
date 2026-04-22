import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { InlineError } from '../components/feedback/InlineError';
import { PageLoading } from '../components/feedback/PageLoading';
import { getEditorExam, type EditorExamDraft } from '../services/authoringEditor';
import { validateExamEditorialState } from '../services/editorialValidation';

type PreviewQuestion = {
  questionId: string;
  sectionTitle: string;
  questionCode: string;
  prompt: string;
  options: Array<{
    optionId: string;
    optionCode: string;
    text: string;
  }>;
};

type PreviewLocationState = {
  draft?: EditorExamDraft;
};

function getStorageKey(examId: string) {
  return `authoring-editor:${examId}`;
}

function flattenQuestions(draft: EditorExamDraft): PreviewQuestion[] {
  let questionCount = 0;

  return draft.sections.flatMap((section) =>
    section.questions.map((question) => {
      questionCount += 1;
      return {
        questionId: question.questionId,
        sectionTitle: section.title,
        questionCode: `Q${questionCount.toString().padStart(2, '0')}`,
        prompt: question.prompt,
        options: question.options.map((option, index) => ({
          optionId: option.optionId,
          optionCode: String.fromCharCode(65 + index),
          text: option.text,
        })),
      };
    }),
  );
}

export function ExamPreviewPage() {
  const { examId } = useParams<{ examId: string }>();
  const location = useLocation();
  const locationState = location.state as PreviewLocationState | null;
  const [draft, setDraft] = useState<EditorExamDraft | null>(locationState?.draft ?? null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(!locationState?.draft);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (locationState?.draft) {
      setDraft(locationState.draft);
      setIsLoading(false);
      return;
    }

    if (!examId || examId === 'new') {
      setErrorMessage('Não foi possível abrir o preview sem uma prova válida.');
      setIsLoading(false);
      return;
    }

    const localDraft = localStorage.getItem(getStorageKey(examId));
    if (localDraft) {
      setDraft(JSON.parse(localDraft) as EditorExamDraft);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(null);

    getEditorExam(examId, controller.signal)
      .then((fetchedDraft) => {
        setDraft(fetchedDraft);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setErrorMessage('Não foi possível carregar a prova para preview.');
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [examId, locationState?.draft]);

  const questions = useMemo(() => (draft ? flattenQuestions(draft) : []), [draft]);
  const currentQuestion = questions[selectedQuestionIndex] ?? null;
  const validation = useMemo(() => (draft ? validateExamEditorialState(draft) : null), [draft]);

  function moveQuestion(offset: -1 | 1) {
    setSelectedQuestionIndex((currentIndex) => Math.max(0, Math.min(currentIndex + offset, questions.length - 1)));
  }

  if (isLoading) {
    return <PageLoading title="Abrindo preview" description="Montando visualização da prova no modo candidato." />;
  }

  if (errorMessage || !draft) {
    return <InlineError title="Falha ao abrir preview" description={errorMessage ?? 'Não foi possível montar o preview.'} />;
  }

  return (
    <div className="exam-session exam-session--surface">
      <header className="exam-session__header">
        <div>
          <p className="exam-session__eyebrow">Preview</p>
          <h1>{draft.title || 'Prova sem título'}</h1>
          <p className="subtitle">Questão {questions.length === 0 ? 0 : selectedQuestionIndex + 1} de {questions.length}</p>
        </div>

        <div className="exam-session__status-grid" aria-label="Resumo do preview">
          <article className="exam-session__status-card">
            <span>Duração</span>
            <strong>{draft.durationMinutes} min</strong>
            <small>Visualização sem contagem regressiva.</small>
          </article>
          <article className="exam-session__status-card">
            <span>Questões respondidas</span>
            <strong>{Object.keys(answers).length}/{questions.length}</strong>
            <small>Respostas apenas locais neste preview.</small>
          </article>
          <article className="exam-session__status-card">
            <span>Contexto</span>
            <strong>Modo Preview</strong>
            <small>Sem criação de tentativa.</small>
          </article>
        </div>
      </header>

      <p className="preview-mode-banner" role="status">
        Modo Preview — sem registro de tentativa
      </p>

      {validation && (validation.summary.blockingErrorCount > 0 || validation.summary.warningCount > 0) ? (
        <p className="preview-warning" role="status">
          A prova possui inconsistências que podem afetar a experiência.
        </p>
      ) : null}

      <div className="exam-session__body">
        <aside className="exam-session__navigator" aria-label="Mapa de questões">
          <header>
            <h2>Mapa da prova</h2>
            <p>{questions.length} questão(ões)</p>
          </header>
          <div className="question-nav-grid">
            {questions.map((question, index) => {
              const selected = index === selectedQuestionIndex;
              const isAnswered = Boolean(answers[question.questionId]);

              return (
                <button
                  key={question.questionId}
                  type="button"
                  className={`question-nav-button ${isAnswered ? 'answered' : 'pending'} ${selected ? 'selected' : ''}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => setSelectedQuestionIndex(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </aside>

        {currentQuestion ? (
          <section className="exam-session__question" aria-label="Questão atual em preview">
            <header className="exam-session__question-header">
              <p>{currentQuestion.sectionTitle}</p>
              <h2>{currentQuestion.questionCode}</h2>
            </header>

            <p className="exam-session__prompt">{currentQuestion.prompt || 'Enunciado vazio.'}</p>

            <fieldset className="option-list">
              <legend className="sr-only">Alternativas da questão {currentQuestion.questionCode}</legend>
              {currentQuestion.options.map((option) => {
                const checked = answers[currentQuestion.questionId] === option.optionId;

                return (
                  <label key={option.optionId} className={`option-item ${checked ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={currentQuestion.questionId}
                      value={option.optionId}
                      checked={checked}
                      onChange={() =>
                        setAnswers((current) => ({
                          ...current,
                          [currentQuestion.questionId]: option.optionId,
                        }))
                      }
                    />
                    <span>
                      <strong>{option.optionCode})</strong> {option.text || 'Alternativa sem texto.'}
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <footer className="exam-session__actions">
              <Button variant="outline" onClick={() => moveQuestion(-1)} disabled={selectedQuestionIndex === 0}>
                Questão anterior
              </Button>
              <Button variant="outline" onClick={() => moveQuestion(1)} disabled={selectedQuestionIndex >= questions.length - 1}>
                Próxima questão
              </Button>

              <Link to={`/authoring/tests/${draft.examId}/edit`} className="details-button">
                Voltar para edição
              </Link>
            </footer>
          </section>
        ) : (
          <section className="exam-session__question" aria-label="Preview vazio">
            <p className="exam-session__prompt">Nenhuma questão disponível para visualização.</p>
            <footer className="exam-session__actions">
              <Link to={`/authoring/tests/${draft.examId}/edit`} className="details-button">
                Voltar para edição
              </Link>
            </footer>
          </section>
        )}
      </div>
    </div>
  );
}
