import type { HTMLAttributes } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';

type InlineErrorProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function InlineError({
  title = 'Não foi possível carregar os dados',
  description,
  onRetry,
  retryLabel = 'Tentar novamente',
  ...props
}: InlineErrorProps) {
  return (
    <Alert variant="destructive" {...props}>
      <AlertTitle>{title}</AlertTitle>
      {description ? <AlertDescription>{description}</AlertDescription> : null}
      {onRetry ? (
        <div className="feedback-inline-error__actions">
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </Alert>
  );
}
