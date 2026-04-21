export type ReviewStatusFilter = 'all' | 'correct' | 'incorrect';
export type ReviewDifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

export type QuestionReviewFilterState = {
  status: ReviewStatusFilter;
  topic: string;
  difficulty: ReviewDifficultyFilter;
};

export type QuestionReviewFilterItem = {
  topic: string;
  difficulty: string;
  isCorrect: boolean;
  userSelectedOptionId?: string;
};

export const DEFAULT_REVIEW_FILTERS: QuestionReviewFilterState = {
  status: 'all',
  topic: 'all',
  difficulty: 'all',
};

export function getReviewTopics(reviews: QuestionReviewFilterItem[]): string[] {
  return Array.from(new Set(reviews.map((review) => review.topic.trim()).filter((topic) => topic.length > 0))).sort(
    (left, right) => left.localeCompare(right, 'pt-BR'),
  );
}

export function applyReviewFilters<T extends QuestionReviewFilterItem>(
  reviews: T[],
  filters: QuestionReviewFilterState,
): T[] {
  return reviews.filter((review) => {
    const matchesStatus =
      filters.status === 'all' ||
      (filters.status === 'correct' && Boolean(review.userSelectedOptionId) && review.isCorrect) ||
      (filters.status === 'incorrect' && (!review.userSelectedOptionId || !review.isCorrect));

    const matchesTopic = filters.topic === 'all' || review.topic === filters.topic;
    const matchesDifficulty =
      filters.difficulty === 'all' || review.difficulty.toLowerCase() === filters.difficulty.toLowerCase();

    return matchesStatus && matchesTopic && matchesDifficulty;
  });
}
