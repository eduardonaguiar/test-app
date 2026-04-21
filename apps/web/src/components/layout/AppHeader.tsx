import { Link } from 'react-router-dom';
import { MainNav } from './MainNav';

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-shell__container app-header__content">
        <Link to="/" className="app-brand" aria-label="Ir para página inicial de simulados">
          <span className="app-brand__eyebrow">Exam Runner</span>
          <strong>Study Simulator</strong>
        </Link>
        <MainNav />
      </div>
    </header>
  );
}
