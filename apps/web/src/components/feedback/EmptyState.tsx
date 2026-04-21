import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ className, title, description, action, icon, ...props }: EmptyStateProps) {
  return (
    <section className={cn('feedback-empty-state', className)} {...props}>
      {icon ? <div className="feedback-empty-state__icon" aria-hidden="true">{icon}</div> : null}
      <h3 className="feedback-empty-state__title">{title}</h3>
      {description ? <p className="feedback-empty-state__description">{description}</p> : null}
      {action ? <div className="feedback-empty-state__actions">{action}</div> : null}
    </section>
  );
}
