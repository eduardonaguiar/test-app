import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type CardSkeletonProps = HTMLAttributes<HTMLDivElement> & {
  count?: number;
  minHeight?: number;
};

export function CardSkeleton({ className, count = 3, minHeight = 180, ...props }: CardSkeletonProps) {
  const style = { '--feedback-card-min-height': `${minHeight}px` } as CSSProperties;

  return (
    <div className={cn('feedback-card-skeleton-grid', className)} role="status" aria-live="polite" aria-label="Carregando cards" {...props}>
      {Array.from({ length: count }).map((_, index) => (
        <article key={`card-skeleton-${index}`} className="feedback-card-skeleton" style={style}>
          <span className="feedback-skeleton-block feedback-card-skeleton__title" />
          <span className="feedback-skeleton-block feedback-card-skeleton__line" />
          <span className="feedback-skeleton-block feedback-card-skeleton__line feedback-card-skeleton__line--short" />
          <div className="feedback-card-skeleton__meta">
            <span className="feedback-skeleton-block" />
            <span className="feedback-skeleton-block" />
            <span className="feedback-skeleton-block" />
          </div>
          <span className="feedback-skeleton-block feedback-card-skeleton__button" />
        </article>
      ))}
    </div>
  );
}
