import { useEffect, useState } from 'react';

type HealthStatus = {
  status: string;
  checkedAt: string;
};

export function HomePage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealthStatus() {
      try {
        const response = await fetch('/health', { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Health endpoint failed with status ${response.status}`);
        }

        const data: HealthStatus = await response.json();
        setHealthStatus(data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setErrorMessage('Unable to load backend health status.');
      }
    }

    loadHealthStatus();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="page">
      <h1>Exam Runner</h1>
      <p className="subtitle">Local-first study exam simulator</p>

      <section className="status-card" aria-label="API health status">
        <h2>Backend Health</h2>

        {errorMessage ? (
          <p>{errorMessage}</p>
        ) : healthStatus ? (
          <dl>
            <div>
              <dt>Status</dt>
              <dd>{healthStatus.status}</dd>
            </div>
            <div>
              <dt>Checked at</dt>
              <dd>{new Date(healthStatus.checkedAt).toLocaleString()}</dd>
            </div>
          </dl>
        ) : (
          <p>Checking backend health…</p>
        )}
      </section>
    </main>
  );
}
