import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type PerformanceDashboardResponse = {
  summary: {
    totalAttempts: number;
    totalQuestions: number;
    totalCorrect: number;
    totalIncorrect: number;
    globalAccuracyRate: number;
    averageAttemptPercentage: number;
    lastAttemptPercentage?: number;
    bestAttemptPercentage?: number;
  };
  attemptTrend: Array<{
    attemptId: string;
    label: string;
    executedAt: string;
    percentage: number;
  }>;
  topicPerformance: Array<{
    topic: string;
    totalQuestions: number;
    totalCorrect: number;
    totalIncorrect: number;
    accuracyRate: number;
  }>;
};

function formatPercentage(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return `${value.toFixed(1)}%`;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

export function PerformanceDashboardPage() {
  const [dashboard, setDashboard] = useState<PerformanceDashboardResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      const response = await fetch('/api/performance', { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`GET /api/performance failed with status ${response.status}`);
      }

      const payload = (await response.json()) as PerformanceDashboardResponse;
      setDashboard(payload);
    }

    loadDashboard().catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Não foi possível carregar o dashboard de desempenho.');
    });

    return () => {
      controller.abort();
    };
  }, []);

  const hasData = useMemo(() => (dashboard ? dashboard.summary.totalAttempts > 0 : false), [dashboard]);

  return (
    <main className="page">
      <div className="inline-links">
        <Link to="/" className="back-link">
          ← Voltar para provas
        </Link>
        <Link to="/history" className="back-link">
          Ver histórico
        </Link>
      </div>

      <header className="exam-details-header">
        <h1>Dashboard de desempenho</h1>
        <p className="subtitle">Acompanhe sua evolução de estudo e identifique os assuntos que merecem revisão.</p>
      </header>

      {errorMessage ? (
        <p>{errorMessage}</p>
      ) : dashboard ? (
        hasData ? (
          <>
            <section className="kpi-grid" aria-label="Resumo geral de desempenho">
              <article className="exam-card">
                <h2>Tentativas realizadas</h2>
                <p className="kpi-value">{dashboard.summary.totalAttempts}</p>
              </article>
              <article className="exam-card">
                <h2>Taxa geral de acerto</h2>
                <p className="kpi-value">{formatPercentage(dashboard.summary.globalAccuracyRate)}</p>
              </article>
              <article className="exam-card">
                <h2>Média percentual</h2>
                <p className="kpi-value">{formatPercentage(dashboard.summary.averageAttemptPercentage)}</p>
              </article>
              <article className="exam-card">
                <h2>Último resultado</h2>
                <p className="kpi-value">{formatPercentage(dashboard.summary.lastAttemptPercentage)}</p>
              </article>
            </section>

            <section className="exam-card" aria-label="Evolução por tentativa">
              <h2>Evolução por tentativa</h2>
              <ul className="trend-list">
                {dashboard.attemptTrend.map((attempt) => (
                  <li key={attempt.attemptId} className="trend-item">
                    <span>{attempt.label}</span>
                    <span>{formatDateTime(attempt.executedAt)}</span>
                    <strong>{formatPercentage(attempt.percentage)}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <section className="exam-card" aria-label="Temas com maior erro">
              <h2>Temas com maior erro</h2>
              <p className="subtitle">Ordenado do menor para o maior índice de acerto.</p>
              <div className="topic-table-wrapper">
                <table className="topic-table">
                  <thead>
                    <tr>
                      <th>Tema</th>
                      <th>Questões</th>
                      <th>Acertos</th>
                      <th>Erros</th>
                      <th>Taxa de acerto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.topicPerformance.map((topic) => (
                      <tr key={topic.topic}>
                        <td>{topic.topic}</td>
                        <td>{topic.totalQuestions}</td>
                        <td>{topic.totalCorrect}</td>
                        <td>{topic.totalIncorrect}</td>
                        <td>{formatPercentage(topic.accuracyRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <section className="exam-card" aria-label="Dashboard vazio">
            <p>Você ainda não possui tentativas suficientes para gerar insights.</p>
            <p>Realize uma prova para começar a acompanhar seu desempenho.</p>
          </section>
        )
      ) : (
        <p>Carregando dashboard…</p>
      )}
    </main>
  );
}
