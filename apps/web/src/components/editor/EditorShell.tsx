import type { ReactNode } from 'react';

type EditorShellProps = {
  header: ReactNode;
  tabs: ReactNode;
  main: ReactNode;
  sidebar: ReactNode;
};

export function EditorShell({ header, tabs, main, sidebar }: EditorShellProps) {
  return (
    <div className="editor-shell">
      {header}
      <main className="editor-shell__body" id="editor-main-content">
        <section className="editor-shell__main-column">
          {tabs}
          <div className="editor-shell__main-content">{main}</div>
        </section>
        {sidebar}
      </main>
    </div>
  );
}
