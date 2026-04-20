import { useEffect, useState } from 'react';
import { getHealth, listExams } from '../generated/api-contract';

type DashboardState = {
  healthStatus: string;
  checkedAt: string;
  examCount: number;
};

export function HomePage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      const [healthResult, examsResult] = await Promise.all([
        getHealth(controller.signal),
        listExams(controller.signal),
      ]);

      setState({
        healthStatus: healthResult.status,
        checkedAt: healthResult.timestamp,
        examCount: examsResult.items.length,
      });
    }

    loadDashboard().catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Unable to load backend API contract data.');
    });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="page">
      <h1>Exam Runner</h1>
      <p className="subtitle">Local-first study exam simulator</p>

      <section className="status-card" aria-label="API health status">
        <h2>Backend Contract Status</h2>

        {errorMessage ? (
          <p>{errorMessage}</p>
        ) : state ? (
          <dl>
            <div>
              <dt>Health</dt>
              <dd>{state.healthStatus}</dd>
            </div>
            <div>
              <dt>Checked at</dt>
              <dd>{new Date(state.checkedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Exam contracts</dt>
              <dd>{state.examCount}</dd>
            </div>
          </dl>
        ) : (
          <p>Loading API contract data…</p>
        )}
      </section>
    </main>
  );
}
