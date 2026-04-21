import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { PageSection } from '../components/layout/PageSection';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';

type AttemptHistoryItemResponse = {
  attemptId: string;
  examId: string;
  examTitle: string;
  attemptedAt: string;
  score?: number;
  percentage?: number;
  timeSpentSeconds: number;
  status: string;
};

type AttemptHistoryResponse = {
  items: AttemptHistoryItemResponse[];
};

function formatDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function normalizePercentage(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return `${value.toFixed(1)}%`;
}

function canOpenResult(status: string): boolean {
  return status !== 'InProgress';
}

export function HistoryPage() {
  const [history, setHistory] = useState<AttemptHistoryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      const response = await fetch('/api/history', { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`GET /api/history failed with status ${response.status}`);
      }

      const payload = (await response.json()) as AttemptHistoryResponse;
      setHistory(payload);
    }

    loadHistory().catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Não foi possível carregar o histórico de tentativas.');
    });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className="stack-md">
      <PageHeader
        title="Histórico de tentativas"
        description="Revise tentativas anteriores e abra os resultados finalizados."
        actions={
          <Link to="/" className="ui-button ui-button--outline ui-button--default-size">
            Voltar para simulados
          </Link>
        }
      />

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar histórico</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : history ? (
        <PageSection ariaLabel="Histórico de tentativas">
          {history.items.length === 0 ? (
            <Alert>
              <AlertTitle>Nenhuma tentativa registrada</AlertTitle>
              <AlertDescription>Nenhuma tentativa finalizada ou em andamento foi registrada até o momento.</AlertDescription>
            </Alert>
          ) : (
            <div className="stack-md">
              {history.items.map((attempt) => {
                const finalized = canOpenResult(attempt.status);

                return (
                  <Card key={attempt.attemptId}>
                    <CardHeader>
                      <CardTitle>{attempt.examTitle}</CardTitle>
                      <CardDescription>Tentativa {attempt.attemptId}</CardDescription>
                    </CardHeader>

                    <CardContent>
                      <dl className="meta-grid">
                        <div>
                          <dt>Status</dt>
                          <dd>
                            <Badge variant={finalized ? 'success' : 'warning'}>{attempt.status}</Badge>
                          </dd>
                        </div>
                        <div>
                          <dt>Data</dt>
                          <dd>{formatDateTime(attempt.attemptedAt)}</dd>
                        </div>
                        <div>
                          <dt>Nota</dt>
                          <dd>{attempt.score ?? '—'}</dd>
                        </div>
                        <div>
                          <dt>Percentual</dt>
                          <dd>{normalizePercentage(attempt.percentage)}</dd>
                        </div>
                        <div>
                          <dt>Tempo gasto</dt>
                          <dd>{formatDuration(attempt.timeSpentSeconds)}</dd>
                        </div>
                      </dl>
                    </CardContent>

                    <CardFooter className="inline-links">
                      <Link className="ui-button ui-button--default ui-button--default-size" to={`/attempts/${attempt.attemptId}`}>
                        Abrir tentativa
                      </Link>
                      {finalized ? (
                        <Link
                          className="ui-button ui-button--outline ui-button--default-size"
                          to={`/attempts/${attempt.attemptId}/result`}
                        >
                          Abrir revisão completa
                        </Link>
                      ) : (
                        <span className="subtitle">Finalize a tentativa para liberar a revisão completa.</span>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </PageSection>
      ) : (
        <Alert>
          <AlertTitle>Carregando histórico</AlertTitle>
          <AlertDescription>Buscando tentativas registradas...</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
