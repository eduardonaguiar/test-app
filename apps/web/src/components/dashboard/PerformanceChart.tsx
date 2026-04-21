import { formatDateTime, formatPercentage, type DashboardTrendPoint } from '../../lib/performanceDashboard';

type PerformanceChartProps = {
  data: DashboardTrendPoint[];
};

type ChartPoint = {
  x: number;
  y: number;
  item: DashboardTrendPoint;
};

const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 260;
const PADDING = { top: 16, right: 24, bottom: 36, left: 40 };

function mapPoints(data: DashboardTrendPoint[]): ChartPoint[] {
  const drawableWidth = VIEWBOX_WIDTH - PADDING.left - PADDING.right;
  const drawableHeight = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;

  return data.map((item, index) => {
    const x = PADDING.left + (data.length === 1 ? drawableWidth / 2 : (drawableWidth * index) / (data.length - 1));
    const clampedPercentage = Math.max(0, Math.min(100, item.percentage));
    const y = PADDING.top + ((100 - clampedPercentage) / 100) * drawableHeight;

    return { x, y, item };
  });
}

function renderYAxisTicks() {
  const ticks = [0, 25, 50, 75, 100];
  const drawableHeight = VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;

  return ticks.map((tick) => {
    const y = PADDING.top + ((100 - tick) / 100) * drawableHeight;

    return (
      <g key={tick}>
        <line x1={PADDING.left} y1={y} x2={VIEWBOX_WIDTH - PADDING.right} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
        <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#64748b">
          {tick}%
        </text>
      </g>
    );
  });
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const points = mapPoints(data);
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  return (
    <div className="dashboard-chart-shell" role="img" aria-label="Gráfico de evolução de desempenho por tentativa">
      <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="dashboard-chart-svg" preserveAspectRatio="none">
        {renderYAxisTicks()}

        <line
          x1={PADDING.left}
          y1={VIEWBOX_HEIGHT - PADDING.bottom}
          x2={VIEWBOX_WIDTH - PADDING.right}
          y2={VIEWBOX_HEIGHT - PADDING.bottom}
          stroke="#cbd5e1"
        />

        {points.length > 1 ? <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" /> : null}

        {points.map((point) => (
          <g key={point.item.attemptId}>
            <circle cx={point.x} cy={point.y} r="4" fill="#2563eb">
              <title>{`${point.item.attemptLabel} • ${formatPercentage(point.item.percentage)} • ${formatDateTime(point.item.executedAt)}`}</title>
            </circle>
            <text x={point.x} y={VIEWBOX_HEIGHT - PADDING.bottom + 16} textAnchor="middle" fontSize="11" fill="#64748b">
              {point.item.attemptLabel}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
