import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { InlineError } from '../components/feedback/InlineError';
import { PageLoading } from '../components/feedback/PageLoading';
import { DashboardSummaryCards } from '../components/dashboard/DashboardSummaryCards';
import { PerformanceChart } from '../components/dashboard/PerformanceChart';
import { WeakTopicsTable } from '../components/dashboard/WeakTopicsTable';
import { PageHeader } from '../components/layout/PageHeader';
import { PageSection } from '../components/layout/PageSection';
import { toDashboardViewModel, type PerformanceDashboardResponse } from '../lib/performanceDashboard';

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

  const viewModel = useMemo(() => (dashboard ? toDashboardViewModel(dashboard) : null), [dashboard]);

  return (
    <div className="stack-md">
      <PageHeader
        title="Dashboard"
        description="Acompanhe sua evolução e identifique pontos de melhoria."
        actions={
          <div className="inline-links">
            <Link to="/history" className="ui-button ui-button--outline ui-button--default-size">
              Ver histórico
            </Link>
            <Link to="/" className="ui-button ui-button--outline ui-button--default-size">
              Ir para simulados
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
      ) : viewModel ? (
        viewModel.hasAttempts ? (
          <>
            <PageSection title="Resumo" description="Visão rápida dos seus indicadores atuais.">
              <DashboardSummaryCards items={viewModel.summaryCards} />
            </PageSection>

            <PageSection
              title="Evolução por tentativa"
              description="Cada ponto representa o percentual de acerto de uma tentativa finalizada."
            >
              <PerformanceChart data={viewModel.trendPoints} />
            </PageSection>

            <PageSection
              title="Temas com maior erro"
              description="Ordenado por taxa de erro decrescente para orientar prioridade de estudo."
            >
              <WeakTopicsTable topics={viewModel.weakTopics} />
            </PageSection>
          </>
        ) : (
          <EmptyState
            title="Sem dados suficientes ainda"
            description="Realize alguns simulados para começar a acompanhar sua evolução."
            action={
              <Link className="ui-button ui-button--default ui-button--default-size" to="/">
                Ir para simulados
              </Link>
            }
          />
        )
      ) : (
        <PageLoading
          title="Carregando dashboard"
          description="Consolidando tentativas, evolução e análise por tópicos..."
        />
      )}
    </div>
  );
}
