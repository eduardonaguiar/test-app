import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { PageLoading } from '../components/feedback/PageLoading';
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

type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';
type TimerTone = 'normal' | 'warning' | 'critical';

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

function getAutosaveMessage(autosaveState: AutosaveState): string {
  if (autosaveState === 'saving') {
    return 'Salvando respostas...';
  }

  if (autosaveState === 'saved') {
    return 'Salvo automaticamente.';
  }

  if (autosaveState === 'error') {
    return 'Falha ao salvar. Tentando novamente...';
  }

  return 'Aguardando alterações.';
}

function getTimerTone(remainingSeconds: number): TimerTone {
  if (remainingSeconds <= 60) {
    return 'critical';
  }

  if (remainingSeconds <= 600) {
    return 'warning';
  }

  return 'normal';
}

export function AttemptExecutionPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<AttemptExecutionViewModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle');
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
        setAutosaveState('error');
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

      setAutosaveState('saving');
      isSyncingRef.current = true;
      saveAttemptAnswer(attemptId, questionId, { selectedOptionId })
        .then((updatedAttempt) => {
          pendingAnswersRef.current.delete(questionId);
          setState((previous) => ({
            attempt: applyPendingAnswers(updatedAttempt, pendingAnswersRef.current),
            selectedQuestionIndex: previous?.selectedQuestionIndex ?? 0,
          }));
          setAutosaveState('saved');
        })
        .catch(() => {
          setAutosaveState('error');
        })
        .finally(() => {
          isSyncingRef.current = false;
        });
    }, 1200);

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

  const totalQuestions = state?.attempt.questions.length ?? 0;
  const answeredQuestions = state?.attempt.answeredQuestionCount ?? 0;
  const pendingQuestions = Math.max(totalQuestions - answeredQuestions, 0);
  const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  const timerTone = getTimerTone(state?.attempt.remainingSeconds ?? 0);
  const canSubmit = state?.attempt.status === 'InProgress' && !submitting;

  function moveQuestion(offset: -1 | 1) {
    setState((previous) => {
      if (!previous) {
        return previous;
      }

      const nextIndex = Math.max(0, Math.min(previous.selectedQuestionIndex + offset, previous.attempt.questions.length - 1));
      return {
        ...previous,
        selectedQuestionIndex: nextIndex,
      };
    });
  }

  function handleSelectOption(questionId: string, optionId: string) {
    setAutosaveState('saving');
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
  }

  async function handleSubmitAttempt() {
    if (!attemptId || !state || state.attempt.status !== 'InProgress') {
      return;
    }

    setSubmitting(true);

    try {
      await submitAttempt(attemptId);
      navigate(`/attempts/${attemptId}/result`);
    } finally {
      setSubmitting(false);
    }
  }

  if (errorMessage) {
    return <p>{errorMessage}</p>;
  }

  if (!state) {
    return <PageLoading title="Preparando ambiente da prova" description="Carregando tentativa e respostas salvas." centered />;
  }

  return (
    <div className="exam-session">
      <header className="exam-session__header">
        <div>
          <p className="exam-session__eyebrow">Ambiente de prova</p>
          <h1>Execução da tentativa</h1>
          <p className="subtitle">Questão {state.selectedQuestionIndex + 1} de {totalQuestions}</p>
        </div>

        <div className="exam-session__status-grid" aria-label="Status da tentativa">
          <article className={`exam-session__status-card timer-${timerTone}`}>
            <span>Tempo restante</span>
            <strong>{formatRemaining(state.attempt.remainingSeconds)}</strong>
            {timerTone !== 'normal' ? (
              <small>{timerTone === 'critical' ? 'Tempo crítico: finalize sua revisão.' : 'Atenção: fase final da prova.'}</small>
            ) : null}
          </article>
          <article className="exam-session__status-card">
            <span>Progresso</span>
            <strong>{answeredQuestions}/{totalQuestions}</strong>
            <small>{pendingQuestions} pendente(s)</small>
          </article>
          <article className={`exam-session__status-card autosave-${autosaveState}`}>
            <span>Autosave</span>
            <strong>{getAutosaveMessage(autosaveState)}</strong>
            <small>Estado sincronizado com a API.</small>
          </article>
        </div>
      </header>

      <div className="exam-session__body">
        <aside className="exam-session__navigator" aria-label="Mapa de questões">
          <header>
            <h2>Mapa da prova</h2>
            <p>{progressPercentage}% concluído</p>
          </header>
          <div className="question-nav-grid">
            {state.attempt.questions.map((question, index) => {
              const selected = index === state.selectedQuestionIndex;

              return (
                <button
                  key={question.questionId}
                  type="button"
                  className={`question-nav-button ${question.isAnswered ? 'answered' : 'pending'} ${selected ? 'selected' : ''}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => setState((previous) => previous ? { ...previous, selectedQuestionIndex: index } : previous)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </aside>

        {currentQuestion ? (
          <section className="exam-session__question" aria-label="Questão atual">
            <header className="exam-session__question-header">
              <p>{currentQuestion.sectionTitle}</p>
              <h2>{currentQuestion.questionCode}</h2>
            </header>

            <p className="exam-session__prompt">{currentQuestion.prompt}</p>

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

            <footer className="exam-session__actions">
              <Button variant="outline" onClick={() => moveQuestion(-1)} disabled={state.selectedQuestionIndex === 0}>
                Questão anterior
              </Button>
              <Button
                variant="outline"
                onClick={() => moveQuestion(1)}
                disabled={state.selectedQuestionIndex >= totalQuestions - 1}
              >
                Próxima questão
              </Button>

              <DialogRoot>
                <DialogTrigger className="ui-button ui-button--destructive ui-button--default-size" disabled={!canSubmit}>
                  {submitting ? 'Enviando...' : 'Enviar prova'}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar envio da prova</DialogTitle>
                    <DialogDescription>
                      Você respondeu {answeredQuestions} de {totalQuestions} questões. Restam {pendingQuestions} pendência(s). Após o envio, a prova será encerrada.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose className="ui-button ui-button--outline ui-button--default-size">Voltar para revisão</DialogClose>
                    <Button variant="destructive" onClick={handleSubmitAttempt} disabled={!canSubmit}>
                      Confirmar envio
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </DialogRoot>

              {state.attempt.status !== 'InProgress' ? (
                <Link to={`/attempts/${state.attempt.attemptId}/result`} className="details-button">
                  Ver resultado final
                </Link>
              ) : null}
            </footer>
          </section>
        ) : null}
      </div>
    </div>
  );
}
