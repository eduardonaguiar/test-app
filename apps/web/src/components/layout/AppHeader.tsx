import { Link, useMatch } from 'react-router-dom';
import { MainNav } from './MainNav';

export function AppHeader() {
  const isExamExecutionMode = useMatch('/attempts/:attemptId') !== null;

  return (
    <header className={`app-header ${isExamExecutionMode ? 'app-header--exam-mode' : ''}`}>
      <div className="app-shell__container app-header__content">
        <Link to="/" className="app-brand" aria-label="Ir para página inicial de simulados">
          <span className="app-brand__eyebrow">Exam Runner</span>
          <strong>{isExamExecutionMode ? 'Modo de prova' : 'Study Simulator'}</strong>
        </Link>
        {isExamExecutionMode ? <span className="app-header__mode-label">Ambiente focado</span> : <MainNav />}
      </div>
    </header>
  );
}
