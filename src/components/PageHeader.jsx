import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

/** En-tête des pages secondaires : retour + titre, collé en haut. */
export default function PageHeader({ title, back = '/', children }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-ink-line flex items-center gap-2 px-2 h-14"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(back))} aria-label="Retour"
        className="w-11 h-11 flex items-center justify-center rounded-full active:bg-ink-fill">
        <Icon name="arrowLeft" size={22} />
      </button>
      <h1 className="text-lg font-bold text-ink truncate flex-1">{title}</h1>
      {children}
    </header>
  );
}
