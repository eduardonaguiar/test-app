type HealthStatus = {
  status: 'healthy';
  checkedAt: string;
};

const mockHealthStatus: HealthStatus = {
  status: 'healthy',
  checkedAt: new Date().toISOString(),
};

export function HomePage() {
  return (
    <main className="page">
      <h1>Exam Runner</h1>
      <p className="subtitle">Local-first study exam simulator</p>

      <section className="status-card" aria-label="API health status">
        <h2>Backend Health (mock)</h2>
        <dl>
          <div>
            <dt>Status</dt>
            <dd>{mockHealthStatus.status}</dd>
          </div>
          <div>
            <dt>Checked at</dt>
            <dd>{new Date(mockHealthStatus.checkedAt).toLocaleString()}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
