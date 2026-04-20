import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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

export function AttemptExecutionPage() {
  const { attemptId } = useParams();
  const [state, setState] = useState<AttemptExecutionViewModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStateMessage, setSaveStateMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        attempt,
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

    setSaveStateMessage('Salvando resposta...');

    try {
      const updated = await saveAttemptAnswer(attemptId, questionId, { selectedOptionId: optionId });
      setState((previous) => ({
        attempt: updated,
        selectedQuestionIndex: previous?.selectedQuestionIndex ?? 0,
      }));
      setSaveStateMessage('Resposta salva automaticamente.');
    } catch {
      setSaveStateMessage('Falha ao salvar automaticamente. Tente novamente.');
    }
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
      setSaveStateMessage('Tentativa submetida com sucesso.');
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
          </section>
        </>
      ) : (
        <p>Carregando estado da tentativa…</p>
      )}
    </main>
  );
}
