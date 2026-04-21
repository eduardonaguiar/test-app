import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type TableSkeletonProps = HTMLAttributes<HTMLDivElement> & {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
};

export function TableSkeleton({ className, rows = 5, columns = 5, showHeader = true, ...props }: TableSkeletonProps) {
  const style = { '--feedback-table-columns': columns } as CSSProperties;

  return (
    <div
      className={cn('feedback-table-skeleton', className)}
      style={style}
      role="status"
      aria-live="polite"
      aria-label="Carregando conteúdo tabular"
      {...props}
    >
      {showHeader ? (
        <div className="feedback-table-skeleton__row feedback-table-skeleton__row--header">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <span key={`header-${columnIndex}`} className="feedback-skeleton-block" />
          ))}
        </div>
      ) : null}

      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="feedback-table-skeleton__row">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <span key={`cell-${rowIndex}-${columnIndex}`} className="feedback-skeleton-block" />
          ))}
        </div>
      ))}
    </div>
  );
}
