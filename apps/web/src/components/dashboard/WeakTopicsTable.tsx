import { formatPercentage, type WeakTopicItem } from '../../lib/performanceDashboard';

type WeakTopicsTableProps = {
  topics: WeakTopicItem[];
};

export function WeakTopicsTable({ topics }: WeakTopicsTableProps) {
  return (
    <div className="dashboard-topic-table-wrapper">
      <table className="dashboard-topic-table">
        <thead>
          <tr>
            <th>Tópico</th>
            <th>Questões</th>
            <th>Erros</th>
            <th>Taxa de erro</th>
          </tr>
        </thead>
        <tbody>
          {topics.map((topic) => (
            <tr key={topic.topic}>
              <td>{topic.topic}</td>
              <td>{topic.totalQuestions}</td>
              <td>{topic.totalErrors}</td>
              <td>{formatPercentage(topic.errorRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
