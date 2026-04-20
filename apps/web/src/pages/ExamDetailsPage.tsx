import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ExamDetailResponse } from '../generated/api-contract';

type ReconnectPolicyViewModel = {
  enabled: boolean;
  maxReconnectAttempts: number;
  gracePeriodSeconds: number;
};

type ExamDetailsViewModel = {
  exam: ExamDetailResponse;
  reconnectPolicy: ReconnectPolicyViewModel | null;
};

function formatDuration(durationMinutes: number): string {
  if (durationMinutes < 60) {
    return `${durationMinutes} min`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

function extractReconnectPolicy(payload: unknown): ReconnectPolicyViewModel | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = (payload as { reconnectPolicy?: unknown }).reconnectPolicy;

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const normalized = candidate as {
    enabled?: unknown;
    maxReconnectAttempts?: unknown;
    gracePeriodSeconds?: unknown;
  };

  if (
    typeof normalized.enabled !== 'boolean' ||
    typeof normalized.maxReconnectAttempts !== 'number' ||
    typeof normalized.gracePeriodSeconds !== 'number'
  ) {
    return null;
  }

  return {
    enabled: normalized.enabled,
    maxReconnectAttempts: normalized.maxReconnectAttempts,
    gracePeriodSeconds: normalized.gracePeriodSeconds,
  };
}

export function ExamDetailsPage() {
  const { examId } = useParams();
  const [state, setState] = useState<ExamDetailsViewModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startMessage, setStartMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) {
      setErrorMessage('ID da prova inválido.');
      return;
    }

    const controller = new AbortController();

    async function loadExamDetails() {
      const response = await fetch(`/api/exams/${examId}`, {
        signal: controller.signal,
      });

      if (response.status === 404) {
        setErrorMessage('Prova não encontrada.');
        return;
      }

      if (!response.ok) {
        throw new Error(`GET /api/exams/${examId} failed with status ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      const exam = payload as ExamDetailResponse;
      const reconnectPolicy = extractReconnectPolicy(payload);

      setState({ exam, reconnectPolicy });
    }

    loadExamDetails().catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Não foi possível carregar os detalhes da prova.');
    });

    return () => {
      controller.abort();
    };
  }, [examId]);

  const reconnectDescription = useMemo(() => {
    if (!state?.reconnectPolicy) {
      return 'Não informada pela API para esta prova.';
    }

    if (!state.reconnectPolicy.enabled) {
      return 'Desativada para esta prova.';
    }

    return `${state.reconnectPolicy.maxReconnectAttempts} reconexões, com tolerância de ${state.reconnectPolicy.gracePeriodSeconds}s offline por reconexão.`;
  }, [state]);

  const totalQuestions = useMemo(
    () => state?.exam.sections.reduce((accumulator, section) => accumulator + section.questionCount, 0) ?? 0,
    [state],
  );

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
            <h1>{state.exam.title}</h1>
            <p className="subtitle">{state.exam.description}</p>
          </header>

          <section className="exam-card" aria-label="Detalhes gerais da prova">
            <dl className="exam-metadata">
              <div>
                <dt>Duração</dt>
                <dd>{formatDuration(state.exam.durationMinutes)}</dd>
              </div>
              <div>
                <dt>Passing score</dt>
                <dd>{state.exam.passingScorePercentage}%</dd>
              </div>
              <div>
                <dt>Seções</dt>
                <dd>{state.exam.sections.length}</dd>
              </div>
              <div>
                <dt>Questões</dt>
                <dd>{totalQuestions}</dd>
              </div>
            </dl>
          </section>

          <section className="exam-card" aria-label="Instruções da prova">
            <h2>Instruções</h2>
            <ul className="instruction-list">
              <li>Leia cada questão com atenção antes de responder.</li>
              <li>O cronômetro oficial é controlado pelo backend.</li>
              <li>Ao finalizar, revise suas respostas antes de enviar.</li>
            </ul>
          </section>

          <section className="exam-card" aria-label="Política de reconexão">
            <h2>Política de reconexão</h2>
            <p>{reconnectDescription}</p>
          </section>

          <section className="exam-card" aria-label="Resumo das seções">
            <h2>Seções resumidas</h2>
            <ol className="section-summary-list">
              {state.exam.sections.map((section) => (
                <li key={section.sectionId} className="section-summary-item">
                  <div>
                    <strong>{section.title}</strong>
                    <p>ID: {section.sectionId}</p>
                  </div>
                  <span>{section.questionCount} questões</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="exam-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                setStartMessage('Botão pronto para criar tentativa. Integração com POST /attempts será conectada na próxima tarefa.')
              }
            >
              Iniciar prova
            </button>
            {startMessage ? <p className="start-hint">{startMessage}</p> : null}
          </section>
        </>
      ) : (
        <p>Carregando detalhes da prova…</p>
      )}
    </main>
  );
}
