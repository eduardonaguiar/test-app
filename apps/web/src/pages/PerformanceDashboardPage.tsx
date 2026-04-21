import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CardSkeleton } from '../components/feedback/CardSkeleton';
import { EmptyState } from '../components/feedback/EmptyState';
import { InlineError } from '../components/feedback/InlineError';
import { TableSkeleton } from '../components/feedback/TableSkeleton';
import { PageHeader } from '../components/layout/PageHeader';
import { PageSection } from '../components/layout/PageSection';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

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
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setErrorMessage(null);
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
  }, [refreshToken]);

  const hasData = useMemo(() => (dashboard ? dashboard.summary.totalAttempts > 0 : false), [dashboard]);

  return (
    <div className="stack-md">
      <PageHeader
        title="Dashboard"
        description="Acompanhe sua evolução por tentativa e os temas com maior incidência de erro."
        actions={
          <div className="inline-links">
            <Link to="/history" className="ui-button ui-button--outline ui-button--default-size">
              Ver histórico
            </Link>
            <Link to="/" className="ui-button ui-button--outline ui-button--default-size">
              Ver simulados
            </Link>
          </div>
        }
      />

      {errorMessage ? (
        <InlineError
          title="Falha ao carregar dashboard"
          description={errorMessage}
          onRetry={() => {
            setDashboard(null);
            setRefreshToken((current) => current + 1);
          }}
        />
      ) : dashboard ? (
        hasData ? (
          <>
            <PageSection title="Resumo geral" ariaLabel="Resumo geral de desempenho">
              <div className="kpi-grid">
                <Card>
                  <CardHeader><CardTitle>Tentativas realizadas</CardTitle></CardHeader>
                  <CardContent><p className="kpi-value">{dashboard.summary.totalAttempts}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Taxa geral de acerto</CardTitle></CardHeader>
                  <CardContent><p className="kpi-value">{formatPercentage(dashboard.summary.globalAccuracyRate)}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Média percentual</CardTitle></CardHeader>
                  <CardContent><p className="kpi-value">{formatPercentage(dashboard.summary.averageAttemptPercentage)}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Último resultado</CardTitle></CardHeader>
                  <CardContent><p className="kpi-value">{formatPercentage(dashboard.summary.lastAttemptPercentage)}</p></CardContent>
                </Card>
              </div>
            </PageSection>

            <PageSection title="Evolução por tentativa">
              <ul className="trend-list">
                {dashboard.attemptTrend.map((attempt) => (
                  <li key={attempt.attemptId} className="trend-item">
                    <span>{attempt.label}</span>
                    <span>{formatDateTime(attempt.executedAt)}</span>
                    <strong>{formatPercentage(attempt.percentage)}</strong>
                  </li>
                ))}
              </ul>
            </PageSection>

            <PageSection title="Temas com maior erro" description="Ordenado do menor para o maior índice de acerto.">
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
            </PageSection>
          </>
        ) : (
          <EmptyState
            title="Ainda não há dados suficientes para o dashboard"
            description="Finalize ao menos uma tentativa para visualizar os indicadores de desempenho."
            action={
              <Link className="ui-button ui-button--default ui-button--default-size" to="/">
                Iniciar simulado
              </Link>
            }
          />
        )
      ) : (
        <div className="stack-md">
          <CardSkeleton count={4} minHeight={140} />
          <TableSkeleton rows={6} columns={5} />
        </div>
      )}
    </div>
  );
}
