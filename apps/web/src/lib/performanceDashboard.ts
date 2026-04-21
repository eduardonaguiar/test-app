export type PerformanceDashboardResponse = {
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

export type DashboardSummaryCard = {
  label: string;
  value: string;
  context: string;
};

export type DashboardTrendPoint = {
  attemptId: string;
  attemptLabel: string;
  executedAt: string;
  percentage: number;
};

export type WeakTopicItem = {
  topic: string;
  totalQuestions: number;
  totalErrors: number;
  errorRate: number;
};

export type DashboardViewModel = {
  summaryCards: DashboardSummaryCard[];
  trendPoints: DashboardTrendPoint[];
  weakTopics: WeakTopicItem[];
  hasAttempts: boolean;
};

export function formatPercentage(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return `${value.toFixed(1)}%`;
}

export function formatDateTime(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

function formatCount(value: number, unit: string): string {
  return `${value.toLocaleString('pt-BR')} ${unit}`;
}

export function toDashboardViewModel(data: PerformanceDashboardResponse): DashboardViewModel {
  const hasAttempts = data.summary.totalAttempts > 0;
  const summaryCards: DashboardSummaryCard[] = [
    {
      label: 'Média de acerto',
      value: formatPercentage(data.summary.averageAttemptPercentage),
      context: 'Média entre tentativas finalizadas',
    },
    {
      label: 'Última tentativa',
      value: formatPercentage(data.summary.lastAttemptPercentage),
      context: `Melhor resultado: ${formatPercentage(data.summary.bestAttemptPercentage)}`,
    },
    {
      label: 'Total de tentativas',
      value: data.summary.totalAttempts.toLocaleString('pt-BR'),
      context: 'Tentativas concluídas no histórico',
    },
    {
      label: 'Questões respondidas',
      value: data.summary.totalQuestions.toLocaleString('pt-BR'),
      context: formatCount(data.summary.totalCorrect, 'acertos') + ` · ${formatCount(data.summary.totalIncorrect, 'erros')}`,
    },
    {
      label: 'Taxa global de acerto',
      value: formatPercentage(data.summary.globalAccuracyRate),
      context: 'Precisão consolidada em todas as questões',
    },
  ];

  const weakTopics = data.topicPerformance
    .map((topic): WeakTopicItem => ({
      topic: topic.topic,
      totalQuestions: topic.totalQuestions,
      totalErrors: topic.totalIncorrect,
      errorRate: topic.totalQuestions > 0 ? (topic.totalIncorrect / topic.totalQuestions) * 100 : 0,
    }))
    .sort((left, right) => right.errorRate - left.errorRate || right.totalErrors - left.totalErrors || left.topic.localeCompare(right.topic));

  return {
    hasAttempts,
    summaryCards,
    trendPoints: data.attemptTrend.map((point) => ({
      attemptId: point.attemptId,
      attemptLabel: point.label,
      executedAt: point.executedAt,
      percentage: point.percentage,
    })),
    weakTopics,
  };
}
