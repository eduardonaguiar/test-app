import { NavLink, useLocation } from 'react-router-dom';

type MainNavItem = {
  to: string;
  label: string;
  matches?: (pathname: string) => boolean;
};

const NAV_ITEMS: MainNavItem[] = [
  {
    to: '/',
    label: 'Simulados',
    matches: (pathname) => pathname === '/' || pathname.startsWith('/exams'),
  },
  {
    to: '/exams/import',
    label: 'Importar',
    matches: (pathname) => pathname.startsWith('/exams/import'),
  },
  {
    to: '/history',
    label: 'Histórico',
    matches: (pathname) => pathname.startsWith('/history') || pathname.startsWith('/attempts'),
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    matches: (pathname) => pathname.startsWith('/dashboard'),
  },
  {
    to: '/authoring/tests',
    label: 'Autoria',
    matches: (pathname) => pathname.startsWith('/authoring/tests'),
  },
];

export function MainNav() {
  const location = useLocation();

  return (
    <nav aria-label="Navegação principal" className="main-nav">
      {NAV_ITEMS.map((item) => {
        const active = item.matches ? item.matches(location.pathname) : location.pathname === item.to;

        return (
          <NavLink key={item.to} to={item.to} className={`main-nav__link ${active ? 'is-active' : ''}`} end={item.to === '/'}>
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
