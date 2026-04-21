import { cn } from '../../lib/cn';

type LoadingOverlayProps = {
  active: boolean;
  label: string;
  className?: string;
};

export function LoadingOverlay({ active, label, className }: LoadingOverlayProps) {
  if (!active) {
    return null;
  }

  return (
    <div className={cn('loading-overlay', className)} role="status" aria-live="assertive" aria-label={label}>
      <div className="loading-overlay__panel">
        <span className="feedback-spinner" aria-hidden="true" />
        <strong>{label}</strong>
      </div>
    </div>
  );
}
