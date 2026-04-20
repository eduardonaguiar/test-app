import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getAttemptState,
  saveAttemptAnswer,
  submitAttempt,
  type AttemptExecutionQuestionResponse,
  type AttemptExecutionStateResponse,
} from '../generated/api-contract';

type AttemptExecutionViewModel = {
  attempt: AttemptExecutionStateResponse;
  selectedQuestionIndex: number;
};

function formatRemaining(seconds: number): string {
  const totalSeconds = Math.max(0, seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${remainingSeconds.toString().padStart(2, '0')}s`;
  }

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getTotalQuestions(attempt: AttemptExecutionStateResponse): number {
  return attempt.questions.length;
}

function applyPendingAnswers(
  attempt: AttemptExecutionStateResponse,
  pendingAnswers: Map<string, string>,
): AttemptExecutionStateResponse {
  if (pendingAnswers.size === 0) {
    return attempt;
  }

  const questions = attempt.questions.map((question) => {
    const pendingOptionId = pendingAnswers.get(question.questionId);
    if (!pendingOptionId) {
      return question;
    }

    return {
      ...question,
      selectedOptionId: pendingOptionId,
      isAnswered: true,
    };
  });

  const answeredQuestionCount = questions.reduce((count, question) => (question.isAnswered ? count + 1 : count), 0);

  return {
    ...attempt,
    questions,
    answeredQuestionCount,
  };
}

export function AttemptExecutionPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<AttemptExecutionViewModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStateMessage, setSaveStateMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingAnswersRef = useRef<Map<string, string>>(new Map());
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!attemptId) {
      setErrorMessage('ID da tentativa inválido.');
      return;
    }

    const resolvedAttemptId = attemptId;
    const controller = new AbortController();

    async function loadAttemptState() {
      const attempt = await getAttemptState(resolvedAttemptId, controller.signal);
      setState((previous) => ({
        attempt: applyPendingAnswers(attempt, pendingAnswersRef.current),
        selectedQuestionIndex: previous
          ? Math.min(previous.selectedQuestionIndex, Math.max(0, attempt.questions.length - 1))
          : 0,
      }));
    }

    loadAttemptState().catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Não foi possível carregar o estado da tentativa.');
    });

    const intervalId = window.setInterval(() => {
      loadAttemptState().catch(() => {
      setSaveStateMessage('Sem conexão temporária com a API para sincronização.');
    });
  }, 15000);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [attemptId]);

  useEffect(() => {
    if (!attemptId) {
      return;
    }

    const syncIntervalId = window.setInterval(() => {
      if (isSyncingRef.current || pendingAnswersRef.current.size === 0) {
        return;
      }

      const [[questionId, selectedOptionId]] = pendingAnswersRef.current.entries();
      if (!questionId || !selectedOptionId) {
        return;
      }

      isSyncingRef.current = true;
      saveAttemptAnswer(attemptId, questionId, { selectedOptionId })
        .then((updatedAttempt) => {
          pendingAnswersRef.current.delete(questionId);
          setState((previous) => ({
            attempt: applyPendingAnswers(updatedAttempt, pendingAnswersRef.current),
            selectedQuestionIndex: previous?.selectedQuestionIndex ?? 0,
          }));
          setSaveStateMessage(
            pendingAnswersRef.current.size > 0
              ? 'Sincronizando respostas pendentes...'
              : 'Todas as respostas foram salvas.',
          );
        })
        .catch(() => {
          setSaveStateMessage('Falha na sincronização automática. Nova tentativa em instantes.');
        })
        .finally(() => {
          isSyncingRef.current = false;
        });
    }, 2000);

    return () => {
      window.clearInterval(syncIntervalId);
    };
  }, [attemptId]);

  const currentQuestion = useMemo<AttemptExecutionQuestionResponse | null>(() => {
    if (!state?.attempt.questions.length) {
      return null;
    }

    return state.attempt.questions[state.selectedQuestionIndex] ?? null;
  }, [state]);

  const totalQuestions = state ? getTotalQuestions(state.attempt) : 0;
  const answeredQuestions = state?.attempt.answeredQuestionCount ?? 0;
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  async function handleSelectOption(questionId: string, optionId: string) {
    if (!attemptId || !state) {
      return;
    }

    pendingAnswersRef.current.set(questionId, optionId);
    setState((previous) => {
      if (!previous) {
        return previous;
      }

      const questions = previous.attempt.questions.map((question) => {
        if (question.questionId !== questionId) {
          return question;
        }

        return {
          ...question,
          selectedOptionId: optionId,
          isAnswered: true,
        };
      });

      const answeredQuestionCount = questions.reduce((count, question) => (question.isAnswered ? count + 1 : count), 0);

      return {
        ...previous,
        attempt: {
          ...previous.attempt,
          questions,
          answeredQuestionCount,
        },
      };
    });
    setSaveStateMessage('Resposta registrada localmente. Sincronização automática em andamento.');
  }

  async function handleSubmitAttempt() {
    if (!attemptId || !state || state.attempt.status !== 'InProgress') {
      return;
    }

    setSubmitting(true);

    try {
      await submitAttempt(attemptId);
      const updated = await getAttemptState(attemptId);
      setState((previous) => ({
        attempt: updated,
        selectedQuestionIndex: previous?.selectedQuestionIndex ?? 0,
      }));
      setSaveStateMessage('Tentativa submetida com sucesso. Redirecionando para o resultado...');
      window.setTimeout(() => navigate(`/attempts/${attemptId}/result`), 400);
    } catch {
      setSaveStateMessage('Não foi possível submeter a tentativa.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <Link to="/" className="back-link">
        ← Voltar para provas
      </Link>

      {errorMessage ? (
        <p>{errorMessage}</p>
      ) : state ? (
        <>
          <header className="exam-details-header">
            <h1>Execução da tentativa</h1>
            <p className="subtitle">Tentativa {state.attempt.attemptId}</p>
          </header>

          <section className="exam-card" aria-label="Resumo de execução">
            <dl className="exam-metadata">
              <div>
                <dt>Status</dt>
                <dd>{state.attempt.status}</dd>
              </div>
              <div>
                <dt>Tempo restante</dt>
                <dd>{formatRemaining(state.attempt.remainingSeconds)}</dd>
              </div>
              <div>
                <dt>Respondidas</dt>
                <dd>
                  {answeredQuestions}/{totalQuestions}
                </dd>
              </div>
              <div>
                <dt>Progresso</dt>
                <dd>{progressPercentage}%</dd>
              </div>
            </dl>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
            </div>
            {saveStateMessage ? <p className="start-hint">{saveStateMessage}</p> : null}
          </section>

          <section className="exam-card" aria-label="Navegação de questões">
            <h2>Questões</h2>
            <div className="question-nav-grid">
              {state.attempt.questions.map((question, index) => {
                const selected = index === state.selectedQuestionIndex;

                return (
                  <button
                    key={question.questionId}
                    type="button"
                    className={`question-nav-button ${question.isAnswered ? 'answered' : 'pending'} ${selected ? 'selected' : ''}`}
                    onClick={() => setState((previous) => previous ? { ...previous, selectedQuestionIndex: index } : previous)}
                  >
                    {question.questionCode}
                  </button>
                );
              })}
            </div>
          </section>

          {currentQuestion ? (
            <section className="exam-card" aria-label="Questão atual">
              <h2>
                {currentQuestion.questionCode} · {currentQuestion.sectionTitle}
              </h2>
              <p>{currentQuestion.prompt}</p>

              <div className="option-list" role="radiogroup" aria-label={`Alternativas da questão ${currentQuestion.questionCode}`}>
                {currentQuestion.options.map((option) => {
                  const checked = option.optionId === currentQuestion.selectedOptionId;

                  return (
                    <label key={option.optionId} className={`option-item ${checked ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={currentQuestion.questionId}
                        value={option.optionId}
                        checked={checked}
                        onChange={() => handleSelectOption(currentQuestion.questionId, option.optionId)}
                        disabled={state.attempt.status !== 'InProgress'}
                      />
                      <span>
                        <strong>{option.optionCode})</strong> {option.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="exam-actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleSubmitAttempt}
              disabled={submitting || state.attempt.status !== 'InProgress'}
            >
              {submitting ? 'Submetendo...' : 'Submeter prova'}
            </button>
            {state.attempt.status !== 'InProgress' ? (
              <Link to={`/attempts/${state.attempt.attemptId}/result`} className="details-button">
                Ver resultado final
              </Link>
            ) : null}
          </section>
        </>
      ) : (
        <p>Carregando estado da tentativa…</p>
      )}
    </main>
  );
}
