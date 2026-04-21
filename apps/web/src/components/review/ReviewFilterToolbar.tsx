import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { QuestionReviewFilterState, ReviewDifficultyFilter } from '../../pages/reviewFilters';

type ReviewFilterToolbarProps = {
  filters: QuestionReviewFilterState;
  availableTopics: string[];
  filteredCount: number;
  totalCount: number;
  onUpdateFilter: <K extends keyof QuestionReviewFilterState>(key: K, value: QuestionReviewFilterState[K]) => void;
  onReset: () => void;
};

function hasActiveFilters(filters: QuestionReviewFilterState): boolean {
  return filters.status !== 'all' || filters.topic !== 'all' || filters.difficulty !== 'all';
}

export function ReviewFilterToolbar({
  filters,
  availableTopics,
  filteredCount,
  totalCount,
  onUpdateFilter,
  onReset,
}: ReviewFilterToolbarProps) {
  const isFiltered = hasActiveFilters(filters);

  return (
    <section className="review-filter-toolbar" aria-label="Filtros da revisão">
      <div className="review-filter-toolbar__header">
        <p className="review-filter-toolbar__title">Filtrar revisão</p>
        <Badge variant={isFiltered ? 'secondary' : 'outline'}>Mostrando {filteredCount} de {totalCount} questões</Badge>
      </div>

      <div className="review-filter-toolbar__content">
        <div className="review-filter-toolbar__fields">
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

        <Button className="review-filter-toolbar__clear" variant="outline" onClick={onReset} disabled={!isFiltered}>
          Limpar filtros
        </Button>
      </div>
    </section>
  );
}
