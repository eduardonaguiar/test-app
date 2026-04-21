import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { PageSection } from '../components/layout/PageSection';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
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
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar dashboard</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
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
          <Alert>
            <AlertTitle>Dashboard ainda vazio</AlertTitle>
            <AlertDescription>Realize uma prova para começar a acompanhar seu desempenho.</AlertDescription>
          </Alert>
        )
      ) : (
        <Alert>
          <AlertTitle>Carregando dashboard</AlertTitle>
          <AlertDescription>Buscando dados de desempenho...</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
