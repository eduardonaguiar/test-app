import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CardSkeleton } from '../components/feedback/CardSkeleton';
import { EmptyState } from '../components/feedback/EmptyState';
import { InlineError } from '../components/feedback/InlineError';
import { PageHeader } from '../components/layout/PageHeader';
import { PageSection } from '../components/layout/PageSection';
import { ExamCatalogCard, type ExamCatalogDifficulty, type ExamCatalogStatus } from '../components/exams/ExamCatalogCard';
import { Input } from '../components/ui/input';
import type { ExamSummaryResponse, ListExamsResponse } from '../generated/api-contract';
import { listExams } from '../generated/api-contract';

type AttemptHistoryItemResponse = {
  examId: string;
  status: string;
  attemptedAt: string;
};

type AttemptHistoryResponse = {
  items: AttemptHistoryItemResponse[];
};

type ExamsState = {
  exams: ListExamsResponse['items'];
  statusesByExamId: Record<string, ExamCatalogStatus>;
};

function inferDifficulty(exam: ExamSummaryResponse): ExamCatalogDifficulty {
  const questions = exam.questionCount ?? 0;

  if (exam.durationMinutes <= 30 || questions <= 20) {
    return 'easy';
  }

  if (exam.durationMinutes <= 75 || questions <= 50) {
    return 'medium';
  }

  return 'hard';
}

function normalizeAttemptStatus(status: string): ExamCatalogStatus {
  if (status === 'InProgress') {
    return 'in-progress';
  }

  return 'completed';
}

function buildStatusesByExamId(history: AttemptHistoryResponse | null): Record<string, ExamCatalogStatus> {
  if (!history) {
    return {};
  }

  const byExamId = history.items.reduce<Record<string, AttemptHistoryItemResponse[]>>((accumulator, attempt) => {
    const list = accumulator[attempt.examId] ?? [];
    list.push(attempt);
    accumulator[attempt.examId] = list;
    return accumulator;
  }, {});

  const statuses: Record<string, ExamCatalogStatus> = {};

  for (const [examId, attempts] of Object.entries(byExamId)) {
    const mostRecent = [...attempts].sort((left, right) => {
      const leftTime = Date.parse(left.attemptedAt);
      const rightTime = Date.parse(right.attemptedAt);
      return Number.isFinite(rightTime) && Number.isFinite(leftTime) ? rightTime - leftTime : 0;
    })[0];

    statuses[examId] = normalizeAttemptStatus(mostRecent.status);
  }

  return statuses;
}

export function HomePage() {
  const [state, setState] = useState<ExamsState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | ExamCatalogDifficulty>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ExamCatalogStatus>('all');

  useEffect(() => {
    const controller = new AbortController();

    async function loadExams() {
      setErrorMessage(null);
      const examsResult = await listExams(controller.signal);

      let history: AttemptHistoryResponse | null = null;

      try {
        const historyResponse = await fetch('/api/history', { signal: controller.signal });

        if (historyResponse.ok) {
          history = (await historyResponse.json()) as AttemptHistoryResponse;
        }
      } catch {
        history = null;
      }

      setState({ exams: examsResult.items, statusesByExamId: buildStatusesByExamId(history) });
    }

    loadExams().catch((error) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessage('Não foi possível carregar as provas importadas da API.');
    });

    return () => {
      controller.abort();
    };
  }, [refreshToken]);

  const visibleExams = useMemo(() => {
    if (!state) {
      return [];
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return state.exams.filter((exam) => {
      const examDifficulty = inferDifficulty(exam);
      const examStatus = state.statusesByExamId[exam.examId] ?? 'not-started';

      if (difficultyFilter !== 'all' && examDifficulty !== difficultyFilter) {
        return false;
      }

      if (statusFilter !== 'all' && examStatus !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${exam.title} ${exam.description ?? ''}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [difficultyFilter, searchTerm, state, statusFilter]);

  return (
    <div className="stack-md">
      <PageHeader
        title="Simulados"
        description="Encontre, compare e inicie provas de forma rápida para manter seu ritmo de estudo."
        actions={
          <Link className="ui-button ui-button--default ui-button--default-size" to="/exams/import">
            Importar prova
          </Link>
        }
      />

      <PageSection title="Ações rápidas" ariaLabel="Ações rápidas">
        <div className="inline-links">
          <Link className="ui-button ui-button--outline ui-button--default-size" to="/history">
            Ver histórico de tentativas
          </Link>
          <Link className="ui-button ui-button--outline ui-button--default-size" to="/dashboard">
            Ver dashboard de desempenho
          </Link>
        </div>
      </PageSection>

      {errorMessage ? (
        <InlineError
          title="Falha ao carregar provas"
          description={errorMessage}
          onRetry={() => {
            setState(null);
            setRefreshToken((current) => current + 1);
          }}
        />
      ) : state ? (
        <PageSection title="Catálogo de simulados" ariaLabel="Catálogo de simulados">
          {state.exams.length === 0 ? (
            <EmptyState
              title="Nenhum simulado disponível"
              description="Importe um arquivo JSON para começar a usar a ferramenta."
              action={
                <Link className="ui-button ui-button--default ui-button--default-size" to="/exams/import">
                  Importar prova
                </Link>
              }
            />
          ) : (
            <div className="catalog-layout">
              <div className="catalog-toolbar" role="search">
                <label className="filter-field" htmlFor="catalog-search">
                  <span>Busca</span>
                  <Input
                    id="catalog-search"
                    placeholder="Buscar por título ou descrição"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                    }}
                  />
                </label>

                <label className="filter-field" htmlFor="catalog-difficulty-filter">
                  <span>Dificuldade</span>
                  <select
                    id="catalog-difficulty-filter"
                    className="ui-input catalog-toolbar__select"
                    value={difficultyFilter}
                    onChange={(event) => {
                      setDifficultyFilter(event.target.value as 'all' | ExamCatalogDifficulty);
                    }}
                  >
                    <option value="all">Todas dificuldades</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>

                <label className="filter-field" htmlFor="catalog-status-filter">
                  <span>Status</span>
                  <select
                    id="catalog-status-filter"
                    className="ui-input catalog-toolbar__select"
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as 'all' | ExamCatalogStatus);
                    }}
                  >
                    <option value="all">Todos status</option>
                    <option value="not-started">Não iniciado</option>
                    <option value="in-progress">Em progresso</option>
                    <option value="completed">Concluído</option>
                  </select>
                </label>
              </div>

              {visibleExams.length === 0 ? (
                <EmptyState
                  title="Nenhum simulado corresponde aos filtros"
                  description="Ajuste os filtros para ver mais opções de estudo disponíveis."
                />
              ) : (
                <div className="catalog-grid">
                  {visibleExams.map((exam) => (
                    <ExamCatalogCard
                      key={exam.examId}
                      exam={exam}
                      difficulty={inferDifficulty(exam)}
                      status={state.statusesByExamId[exam.examId] ?? 'not-started'}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </PageSection>
      ) : (
        <CardSkeleton count={3} />
      )}
    </div>
  );
}
