import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import type { DashboardSummaryCard } from '../../lib/performanceDashboard';

type DashboardSummaryCardsProps = {
  items: DashboardSummaryCard[];
};

export function DashboardSummaryCards({ items }: DashboardSummaryCardsProps) {
  return (
    <div className="dashboard-kpi-grid">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="dashboard-kpi-value">{item.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="subtitle">{item.context}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
