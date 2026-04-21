import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type BreadcrumbItem = {
  label: string;
  to?: string;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  metadata?: ReactNode;
};

export function PageHeader({ title, description, actions, breadcrumbs, metadata }: PageHeaderProps) {
  return (
    <header className="page-context-header">
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="page-breadcrumbs">
          <ol>
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`}>
                {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="page-context-header__row">
        <div>
          <h1>{title}</h1>
          {description ? <p className="subtitle">{description}</p> : null}
        </div>
        {actions ? <div className="page-context-header__actions">{actions}</div> : null}
      </div>

      {metadata ? <div className="page-context-header__meta">{metadata}</div> : null}
    </header>
  );
}
