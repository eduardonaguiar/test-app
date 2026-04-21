import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';

type AppShellProps = {
  children?: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>
      <AppHeader />
      <main id="main-content" className="app-shell__main" tabIndex={-1}>
        <div className="app-shell__container app-shell__content">{children ?? <Outlet />}</div>
      </main>
    </div>
  );
}
