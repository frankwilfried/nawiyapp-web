import { useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';

const TABS = [
  { path: '/',            icon: 'map',   label: 'Carte'       },
  { path: '/record-trip', icon: 'route', label: 'Enregistrer' },
  { path: '/driver',      icon: 'taxi',  label: 'Chauffeur'   },
];

// Barre de navigation façon Material 3 / Google Maps : pastille sous l'icône active
export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-ink-line"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex max-w-md mx-auto">
        {TABS.map(tab => {
          const active = pathname === tab.path || (tab.path !== '/' && pathname.startsWith(tab.path));
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)} aria-current={active ? 'page' : undefined}
              className="flex-1 h-16 flex flex-col items-center justify-center gap-1">
              <span className={`h-8 w-16 rounded-full flex items-center justify-center transition-colors
                ${active ? 'bg-nawiy-light text-nawiy-600' : 'text-ink-2'}`}>
                <Icon name={tab.icon} size={22} />
              </span>
              <span className={`text-xs ${active ? 'font-semibold text-ink' : 'text-ink-2'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
