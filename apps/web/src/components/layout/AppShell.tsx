import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';

type AppShellProps = {
  children?: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-shell__main">
        <div className="app-shell__container app-shell__content">{children ?? <Outlet />}</div>
      </main>
    </div>
  );
}
