import { useNavigate } from 'react-router-dom';

export default function BackButton({ to, className = '' }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition active:scale-95 ${className}`}
      aria-label="Retour"
    >
      ←
    </button>
  );
}
