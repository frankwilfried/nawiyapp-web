import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { path: '/',            icon: '🗺️',  label: 'Carte'       },
  { path: '/record-trip', icon: '📍',  label: 'Enregistrer' },
  { path: '/driver',      icon: '🚕',  label: 'Chauffeur'   },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-area-pb"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {TABS.map(tab => {
          const active = pathname === tab.path || (tab.path !== '/' && pathname.startsWith(tab.path));
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all
                ${active ? 'text-nawiy-green' : 'text-gray-400 hover:text-gray-600'}`}>
              <span className={`text-2xl transition-transform ${active ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>
              <span className={`text-xs font-medium ${active ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-nawiy-green rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
