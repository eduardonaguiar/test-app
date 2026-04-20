import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAttemptState, type AttemptExecutionStateResponse } from '../generated/api-contract';

type AttemptExecutionViewModel = {
  attempt: AttemptExecutionStateResponse;
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

export function AttemptExecutionPage() {
  const { attemptId } = useParams();
  const [state, setState] = useState<AttemptExecutionViewModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) {
      setErrorMessage('ID da tentativa inválido.');
      return;
    }

    const resolvedAttemptId = attemptId;
    const controller = new AbortController();

    async function loadAttemptState() {
      const attempt = await getAttemptState(resolvedAttemptId, controller.signal);
      setState({ attempt });
    }

    loadAttemptState().catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Não foi possível carregar o estado da tentativa.');
    });

    return () => {
      controller.abort();
    };
  }, [attemptId]);

  const groupedBySection = useMemo(() => {
    if (!state) {
      return [];
    }

    const groups = new Map<string, { sectionId: string; sectionTitle: string; questions: AttemptExecutionStateResponse['questions'] }>();

    state.attempt.questions.forEach((question) => {
      const key = question.sectionId;
      const current = groups.get(key);

      if (!current) {
        groups.set(key, {
          sectionId: question.sectionId,
          sectionTitle: question.sectionTitle,
          questions: [question],
        });

        return;
      }

      current.questions.push(question);
    });

    return Array.from(groups.values());
  }, [state]);

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

          <section className="exam-card" aria-label="Estado da tentativa">
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
                <dd>{state.attempt.answeredQuestionCount}</dd>
              </div>
              <div>
                <dt>Pendentes</dt>
                <dd>{state.attempt.pendingQuestionCount}</dd>
              </div>
            </dl>
          </section>

          <section className="exam-card" aria-label="Questões da tentativa">
            <h2>Questões e respostas salvas</h2>
            {groupedBySection.map((section) => (
              <article key={section.sectionId} className="attempt-section-block">
                <h3>{section.sectionTitle}</h3>
                <ol className="attempt-question-list">
                  {section.questions.map((question) => (
                    <li key={question.questionId} className="attempt-question-item">
                      <p>
                        <strong>{question.questionCode}</strong> — {question.prompt}
                      </p>
                      <p className="attempt-question-status">
                        {question.isAnswered ? 'Respondida' : 'Pendente'}
                      </p>
                      <ul>
                        {question.options.map((option) => (
                          <li key={option.optionId}>
                            {option.optionCode}) {option.text}
                            {option.optionId === question.selectedOptionId ? ' (selecionada)' : ''}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </section>
        </>
      ) : (
        <p>Carregando estado da tentativa…</p>
      )}
    </main>
  );
}
