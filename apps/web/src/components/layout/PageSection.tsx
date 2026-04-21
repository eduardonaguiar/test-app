import type { ReactNode } from 'react';

type PageSectionProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  ariaLabel?: string;
};

export function PageSection({ title, description, children, ariaLabel }: PageSectionProps) {
  return (
    <section className="page-section" aria-label={ariaLabel ?? title}>
      {(title || description) && (
        <header className="page-section__header">
          {title ? <h2>{title}</h2> : null}
          {description ? <p className="subtitle">{description}</p> : null}
        </header>
      )}
      <div className="page-section__body">{children}</div>
    </section>
  );
}
