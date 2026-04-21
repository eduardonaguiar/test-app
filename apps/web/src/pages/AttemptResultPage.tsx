import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/feedback/EmptyState';
import { InlineError } from '../components/feedback/InlineError';
import { PageLoading } from '../components/feedback/PageLoading';
import { SuccessAlert } from '../components/feedback/SuccessAlert';
import { exportAttemptReviewHtml } from '../services/attemptReviewExport';
import {
  applyReviewFilters,
  DEFAULT_REVIEW_FILTERS,
  getReviewTopics,
  type QuestionReviewFilterState,
  type ReviewDifficultyFilter,
} from './reviewFilters';

type AttemptResultQuestionReviewResponse = {
  questionId: string;
  sectionId: string;
  sectionTitle: string;
  questionCode: string;
  prompt: string;
  topic: string;
  difficulty: string;
  userSelectedOptionId?: string;
  userSelectedOptionCode?: string;
  userSelectedOptionText?: string;
  correctOptionId: string;
  correctOptionCode: string;
  correctOptionText: string;
  isCorrect: boolean;
  explanationSummary: string;
  explanationDetails: string;
};

type AttemptResultTopicAnalysisResponse = {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  percentage: number;
};

type AttemptResultResponse = {
  attemptId: string;
  examId: string;
  score: number;
  percentage: number;
  passed: boolean;
  outcome: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  submittedAt: string;
  evaluatedAt: string;
  questionReviews: AttemptResultQuestionReviewResponse[];
  topicAnalysis: AttemptResultTopicAnalysisResponse[];
};

type AttemptExecutionSnapshotResponse = {
  startedAt: string;
};

type ExamTitleResponse = {
  title: string;
};

type ReviewStatus = 'Correta' | 'Errada' | 'Sem resposta';

type ReviewScopeSummaryProps = {
  filteredCount: number;
  totalCount: number;
  filters: QuestionReviewFilterState;
};

function normalizePercentage(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${normalized.toFixed(1)}%`;
}

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

function getReviewStatus(review: AttemptResultQuestionReviewResponse): ReviewStatus {
  if (!review.userSelectedOptionId) {
    return 'Sem resposta';
  }

  return review.isCorrect ? 'Correta' : 'Errada';
}

function getStatusClassName(status: ReviewStatus): string {
  if (status === 'Correta') {
    return 'correct';
  }

  if (status === 'Errada') {
    return 'incorrect';
  }

  return 'unanswered';
}

function getFilterStatusLabel(status: QuestionReviewFilterState['status']): string {
  if (status === 'correct') {
    return 'corretas';
  }

  if (status === 'incorrect') {
    return 'incorretas';
  }

  return 'todas';
}

function hasActiveFilters(filters: QuestionReviewFilterState): boolean {
  return filters.status !== 'all' || filters.topic !== 'all' || filters.difficulty !== 'all';
}

function ReviewScopeSummary({ filteredCount, totalCount, filters }: ReviewScopeSummaryProps) {
  const statusLabel = getFilterStatusLabel(filters.status);
  const topicLabel = filters.topic === 'all' ? null : filters.topic;
  const difficultyLabel = filters.difficulty === 'all' ? null : filters.difficulty;

  return (
    <p className="subtitle review-scope-text">
      Mostrando {filteredCount} de {totalCount} questões ({statusLabel})
      {topicLabel ? ` · tópico ${topicLabel}` : ''}
      {difficultyLabel ? ` · dificuldade ${difficultyLabel}` : ''}.
    </p>
  );
}

type ReviewHeaderProps = {
  result: AttemptResultResponse;
  examTitle: string;
  startedAt: string | null;
  isExporting: boolean;
  exportFeedback: string | null;
  onExport: () => void;
};

function ReviewPageHeader({ result, examTitle, startedAt, isExporting, exportFeedback, onExport }: ReviewHeaderProps) {
  return (
    <header className="attempt-review-header">
      <div className="attempt-review-header__top">
        <div className="stack-xs">
          <h1>Revisão da prova</h1>
          <p className="subtitle">
            {examTitle ? `${examTitle} · ` : ''}
            Tentativa {result.attemptId}
          </p>
          <p className="subtitle">Realizada em {formatDateTime(result.submittedAt)}</p>
        </div>
        <button type="button" className="details-button secondary as-button" onClick={onExport} disabled={isExporting}>
          {isExporting ? 'Exportando revisão...' : 'Exportar revisão (HTML)'}
        </button>
      </div>

      {exportFeedback ? (
        exportFeedback.startsWith('Exportação concluída') ? (
          <SuccessAlert title="Revisão exportada com sucesso" description={exportFeedback} className="attempt-result-feedback" />
        ) : (
          <InlineError title="Falha ao exportar revisão" description={exportFeedback} className="attempt-result-feedback" />
        )
      ) : null}

      <section className="exam-card review-summary-card" aria-label="Resumo geral da revisão">
        <div className="review-summary-card__score-row">
          <div>
            <p className="review-summary-card__label">Resultado final</p>
            <p className="review-summary-card__percentage">{normalizePercentage(result.percentage)}</p>
          </div>
          <span className={`result-status-badge ${result.passed ? 'passed' : 'failed'}`}>
            {result.passed ? 'Aprovado' : 'Reprovado'}
          </span>
        </div>

        <dl className="exam-metadata result-metadata">
          <div>
            <dt>Score</dt>
            <dd>{result.score}</dd>
          </div>
          <div>
            <dt>Total de questões</dt>
            <dd>{result.totalQuestions}</dd>
          </div>
          <div>
            <dt>Acertos</dt>
            <dd>{result.correctAnswers}</dd>
          </div>
          <div>
            <dt>Erros</dt>
            <dd>{result.incorrectAnswers}</dd>
          </div>
          <div>
            <dt>Em branco</dt>
            <dd>{result.unansweredQuestions}</dd>
          </div>
          <div>
            <dt>Início</dt>
            <dd>{startedAt ? formatDateTime(startedAt) : 'Não informado'}</dd>
          </div>
          <div>
            <dt>Submissão</dt>
            <dd>{formatDateTime(result.submittedAt)}</dd>
          </div>
          <div>
            <dt>Avaliação</dt>
            <dd>{formatDateTime(result.evaluatedAt)}</dd>
          </div>
          <div>
            <dt>Status técnico</dt>
            <dd>{result.outcome}</dd>
          </div>
        </dl>
      </section>
    </header>
  );
}

type FilterToolbarProps = {
  filters: QuestionReviewFilterState;
  availableTopics: string[];
  filteredCount: number;
  totalCount: number;
  onUpdateFilter: <K extends keyof QuestionReviewFilterState>(key: K, value: QuestionReviewFilterState[K]) => void;
  onReset: () => void;
};

function ReviewFilterToolbar({ filters, availableTopics, filteredCount, totalCount, onUpdateFilter, onReset }: FilterToolbarProps) {
  return (
    <div className="review-toolbar" role="group" aria-label="Filtros de revisão">
      <div className="review-filters">
        <label className="filter-field">
          <span>Status</span>
          <select value={filters.status} onChange={(event) => onUpdateFilter('status', event.target.value as QuestionReviewFilterState['status'])}>
            <option value="all">Todas</option>
            <option value="correct">Corretas</option>
            <option value="incorrect">Incorretas</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Tópico</span>
          <select value={filters.topic} onChange={(event) => onUpdateFilter('topic', event.target.value)}>
            <option value="all">Todos</option>
            {availableTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Dificuldade</span>
          <select value={filters.difficulty} onChange={(event) => onUpdateFilter('difficulty', event.target.value as ReviewDifficultyFilter)}>
            <option value="all">Todas</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <div className="review-toolbar__meta">
        <ReviewScopeSummary filteredCount={filteredCount} totalCount={totalCount} filters={filters} />
        <button type="button" className="filter-clear-button" onClick={onReset} disabled={!hasActiveFilters(filters)}>
          Limpar filtros
        </button>
      </div>
    </div>
  );
}

type QuestionReviewCardProps = {
  review: AttemptResultQuestionReviewResponse;
};

function QuestionReviewCard({ review }: QuestionReviewCardProps) {
  const status = getReviewStatus(review);
  const statusClass = getStatusClassName(status);

  return (
    <article className={`review-item review-item--${statusClass}`}>
      <header className="review-item-header">
        <div className="stack-xs">
          <h3>{review.questionCode}</h3>
          <p className="review-meta">
            <strong>Seção:</strong> {review.sectionTitle}
          </p>
        </div>
        <div className="review-item-badges">
          <span className={`review-status ${statusClass}`}>{status}</span>
          <span className="review-tag">Tópico: {review.topic}</span>
          <span className="review-tag">Dificuldade: {review.difficulty}</span>
        </div>
      </header>

      <section className="review-block">
        <h4>Enunciado</h4>
        <p>{review.prompt}</p>
      </section>

      <section className="review-answer-grid" aria-label="Comparativo de respostas">
        <article className="review-answer-card review-answer-card--user">
          <h4>Sua resposta</h4>
          <p>
            {review.userSelectedOptionCode && review.userSelectedOptionText
              ? `${review.userSelectedOptionCode}) ${review.userSelectedOptionText}`
              : 'Não respondida'}
          </p>
        </article>

        <article className="review-answer-card review-answer-card--correct">
          <h4>Resposta correta</h4>
          <p>
            {review.correctOptionCode}) {review.correctOptionText}
          </p>
        </article>
      </section>

      <section className="review-block review-block--summary">
        <h4>Explicação resumida</h4>
        <p>{review.explanationSummary}</p>
      </section>

      <section className="review-block review-block--details">
        <h4>Explicação detalhada</h4>
        <p>{review.explanationDetails}</p>
      </section>
    </article>
  );
}

export function AttemptResultPage() {
  const { attemptId } = useParams();
  const [result, setResult] = useState<AttemptResultResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<QuestionReviewFilterState>(DEFAULT_REVIEW_FILTERS);
  const [examTitle, setExamTitle] = useState<string>('');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!attemptId) {
      setErrorMessage('ID da tentativa inválido.');
      return;
    }

    const controller = new AbortController();

    async function loadResult() {
      const response = await fetch(`/api/attempts/${attemptId}/result`, {
        signal: controller.signal,
      });

      if (response.status === 404) {
        setErrorMessage('Tentativa não encontrada.');
        return;
      }

      if (response.status === 409) {
        setErrorMessage('O resultado ainda não está disponível. Submeta a tentativa e tente novamente.');
        return;
      }

      if (!response.ok) {
        throw new Error(`GET /api/attempts/${attemptId}/result failed with status ${response.status}`);
      }

      const payload = (await response.json()) as AttemptResultResponse;
      setResult(payload);

      fetch(`/api/attempts/${attemptId}`, { signal: controller.signal })
        .then(async (attemptResponse) => {
          if (!attemptResponse.ok) {
            return;
          }

          const attemptPayload = (await attemptResponse.json()) as AttemptExecutionSnapshotResponse;
          setStartedAt(attemptPayload.startedAt);
        })
        .catch(() => {
          setStartedAt(null);
        });

      fetch(`/api/exams/${payload.examId}`, { signal: controller.signal })
        .then(async (examResponse) => {
          if (!examResponse.ok) {
            return;
          }

          const examPayload = (await examResponse.json()) as ExamTitleResponse;
          setExamTitle(examPayload.title);
        })
        .catch(() => {
          setExamTitle('');
        });
    }

    loadResult().catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Não foi possível carregar o resultado da tentativa.');
    });

    return () => {
      controller.abort();
    };
  }, [attemptId]);

  const filteredReviews = useMemo(() => (result ? applyReviewFilters(result.questionReviews, filters) : []), [filters, result]);
  const availableTopics = useMemo(() => (result ? getReviewTopics(result.questionReviews) : []), [result]);

  function updateFilter<K extends keyof QuestionReviewFilterState>(key: K, value: QuestionReviewFilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleExportHtml() {
    if (!result || isExporting) {
      return;
    }

    setIsExporting(true);
    setExportFeedback('Gerando arquivo HTML da revisão...');

    try {
      const fileName = exportAttemptReviewHtml(result, {
        examTitle,
        startedAt: startedAt ?? undefined,
      });

      setExportFeedback(`Exportação concluída: ${fileName}`);
    } catch {
      setExportFeedback('Falha ao exportar a revisão. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="stack-md">
      <div className="inline-links">
        <Link to={`/attempts/${attemptId ?? ''}`} className="back-link">
          ← Voltar para execução
        </Link>
        <Link to="/history" className="back-link">
          Ver histórico completo
        </Link>
      </div>

      {errorMessage ? (
        <InlineError title="Falha ao carregar revisão" description={errorMessage} />
      ) : result ? (
        <>
          <ReviewPageHeader
            result={result}
            examTitle={examTitle}
            startedAt={startedAt}
            isExporting={isExporting}
            exportFeedback={exportFeedback}
            onExport={handleExportHtml}
          />

          {result.topicAnalysis.length > 0 ? (
            <section className="exam-card" aria-label="Desempenho por tópico">
              <h2>Desempenho por tópico</h2>
              <div className="topic-analysis-list">
                {result.topicAnalysis.map((topic) => (
                  <article key={topic.topic} className="topic-analysis-item">
                    <h3>{topic.topic}</h3>
                    <p>
                      {topic.correctAnswers}/{topic.totalQuestions} corretas ({normalizePercentage(topic.percentage)})
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="exam-card" aria-label="Revisão detalhada por questão">
            <div className="review-header">
              <div>
                <h2>Revisão orientada por questão</h2>
                <p className="subtitle">Use os filtros para focar nos temas com maior oportunidade de melhoria.</p>
              </div>
            </div>

            <ReviewFilterToolbar
              filters={filters}
              availableTopics={availableTopics}
              filteredCount={filteredReviews.length}
              totalCount={result.questionReviews.length}
              onUpdateFilter={updateFilter}
              onReset={() => setFilters(DEFAULT_REVIEW_FILTERS)}
            />

            <div className="review-list">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((review) => <QuestionReviewCard key={review.questionId} review={review} />)
              ) : (
                <EmptyState
                  title="Nenhuma questão encontrada"
                  description="Ajuste os filtros para visualizar outras questões da revisão."
                  className="review-empty-state"
                  action={
                    <button type="button" className="filter-clear-button" onClick={() => setFilters(DEFAULT_REVIEW_FILTERS)}>
                      Limpar filtros
                    </button>
                  }
                />
              )}
            </div>
          </section>
        </>
      ) : (
        <PageLoading message="Carregando revisão" description="Montando resultado detalhado da tentativa..." />
      )}
    </div>
  );
}
