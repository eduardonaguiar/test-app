import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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
    <main className="page">
      <Link to="/" className="back-link">
        ← Voltar para provas
      </Link>

      <header className="exam-details-header">
        <h1>Histórico de tentativas</h1>
        <p className="subtitle">Revise tentativas anteriores e abra os resultados finalizados.</p>
      </header>

      {errorMessage ? (
        <p>{errorMessage}</p>
      ) : history ? (
        <section aria-label="Histórico de tentativas" className="history-list">
          {history.items.length === 0 ? (
            <p>Nenhuma tentativa finalizada ou em andamento foi registrada até o momento.</p>
          ) : (
            history.items.map((attempt) => {
              const finalized = canOpenResult(attempt.status);

              return (
                <article key={attempt.attemptId} className="exam-card">
                  <header>
                    <h2>{attempt.examTitle}</h2>
                    <p className="exam-description">Tentativa {attempt.attemptId}</p>
                  </header>

                  <dl className="exam-metadata result-metadata">
                    <div>
                      <dt>Status</dt>
                      <dd>{attempt.status}</dd>
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

                  <div className="history-actions">
                    <Link className="details-button" to={`/attempts/${attempt.attemptId}`}>
                      Abrir tentativa
                    </Link>
                    {finalized ? (
                      <Link className="details-button secondary" to={`/attempts/${attempt.attemptId}/result`}>
                        Abrir revisão completa
                      </Link>
                    ) : (
                      <span className="history-hint">Finalize a tentativa para liberar a revisão completa.</span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : (
        <p>Carregando histórico…</p>
      )}
    </main>
  );
}
