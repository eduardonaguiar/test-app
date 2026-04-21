import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type PageLoadingProps = HTMLAttributes<HTMLDivElement> & {
  message?: string;
  description?: string;
  centered?: boolean;
};

export function PageLoading({
  className,
  message = 'Carregando dados',
  description,
  centered = true,
  ...props
}: PageLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('feedback-page-loading', centered && 'feedback-page-loading--centered', className)}
      {...props}
    >
      <span className="feedback-spinner" aria-hidden="true" />
      <div className="stack-xs">
        <p className="feedback-page-loading__title">{message}</p>
        {description ? <p className="feedback-page-loading__description">{description}</p> : null}
      </div>
    </div>
  );
}
