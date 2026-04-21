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

function getReviewStatus(review: AttemptResultQuestionReviewResponse): 'Correta' | 'Errada' | 'Sem resposta' {
  if (!review.userSelectedOptionId) {
    return 'Sem resposta';
  }

  return review.isCorrect ? 'Correta' : 'Errada';
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
          <header className="exam-details-header">
            <div className="review-title-row">
              <div>
                <h1>Resultado final da tentativa</h1>
                <p className="subtitle">Tentativa {result.attemptId}</p>
              </div>
              <button type="button" className="details-button secondary as-button" onClick={handleExportHtml} disabled={isExporting}>
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
          </header>

          <section className="exam-card" aria-label="Resumo da nota">
            <dl className="exam-metadata result-metadata">
              <div>
                <dt>Nota</dt>
                <dd>{result.score}</dd>
              </div>
              <div>
                <dt>Percentual</dt>
                <dd>{normalizePercentage(result.percentage)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`result-status-badge ${result.passed ? 'passed' : 'failed'}`}>
                    {result.passed ? 'Aprovado' : 'Reprovado'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Resultado</dt>
                <dd>{result.outcome}</dd>
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
                <dt>Submetida em</dt>
                <dd>{formatDateTime(result.submittedAt)}</dd>
              </div>
            </dl>
          </section>

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
              <h2>Revisão detalhada por questão</h2>
              <div className="review-filters" role="group" aria-label="Filtros de revisão">
                <label className="filter-field">
                  <span>Status</span>
                  <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value as QuestionReviewFilterState['status'])}>
                    <option value="all">Todas</option>
                    <option value="correct">Corretas</option>
                    <option value="incorrect">Incorretas</option>
                  </select>
                </label>
                <label className="filter-field">
                  <span>Tópico</span>
                  <select value={filters.topic} onChange={(event) => updateFilter('topic', event.target.value)}>
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
                  <select
                    value={filters.difficulty}
                    onChange={(event) => updateFilter('difficulty', event.target.value as ReviewDifficultyFilter)}
                  >
                    <option value="all">Todas</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <button type="button" className="filter-clear-button" onClick={() => setFilters(DEFAULT_REVIEW_FILTERS)}>
                  Limpar filtros
                </button>
              </div>
            </div>

            <p className="subtitle">
              Exibindo {filteredReviews.length} de {result.questionReviews.length} questões.
            </p>

            <div className="review-list">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((review) => {
                  const status = getReviewStatus(review);
                  const statusClass = status === 'Correta' ? 'correct' : status === 'Errada' ? 'incorrect' : 'unanswered';

                  return (
                    <article key={review.questionId} className="review-item">
                      <header className="review-item-header">
                        <h3>
                          {review.questionCode} · {review.sectionTitle}
                        </h3>
                        <span className={`review-status ${statusClass}`}>{status}</span>
                      </header>

                      <p>{review.prompt}</p>
                      <p className="review-meta">
                        <strong>Tópico:</strong> {review.topic} · <strong>Dificuldade:</strong> {review.difficulty}
                      </p>

                      <dl className="review-details">
                        <div>
                          <dt>Sua resposta</dt>
                          <dd>
                            {review.userSelectedOptionCode && review.userSelectedOptionText
                              ? `${review.userSelectedOptionCode}) ${review.userSelectedOptionText}`
                              : 'Não respondida'}
                          </dd>
                        </div>
                        <div>
                          <dt>Resposta correta</dt>
                          <dd>
                            {review.correctOptionCode}) {review.correctOptionText}
                          </dd>
                        </div>
                      </dl>

                      <p>
                        <strong>Resumo:</strong> {review.explanationSummary}
                      </p>
                      <p>
                        <strong>Comentário detalhado:</strong> {review.explanationDetails}
                      </p>
                    </article>
                  );
                })
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
