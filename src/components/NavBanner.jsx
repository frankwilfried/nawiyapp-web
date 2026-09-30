import { motion } from 'framer-motion';
import Icon from './Icon';

const fmtDist = (m) => (m > 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m)} m`);

function turnIcon(step) {
  if (step?.type === 'arrive') return 'flag';
  if (step?.instruction?.includes('gauche')) return 'turnLeft';
  if (step?.instruction?.includes('droite')) return 'turnRight';
  return 'arrowUp';
}

// Navigation façon Google Maps : consigne en haut, temps restant et « Quitter » en bas
export default function NavBanner({ navActive, navSteps, navStepIdx, navDistM, navEtaMin, navTotalM, navArrivalTs, onStop }) {
  if (!navActive || !navSteps.length) return null;

  const step = navSteps[navStepIdx];
  const progress = Math.max(5, 100 - (navDistM / (navTotalM || 1)) * 100);
  const arrival = navArrivalTs ? new Date(navArrivalTs).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <>
      <motion.div
        initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-50 px-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        role="status" aria-live="polite"
      >
        <div className="max-w-md mx-auto bg-nawiy-600 text-white rounded-2xl shadow-float px-4 py-3 flex items-center gap-4">
          <Icon name={turnIcon(step)} size={40} strokeWidth={2.5} className="flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-2xl font-bold leading-tight">{fmtDist(step?.distanceM || 0)}</div>
            <div className="text-base leading-snug line-clamp-2">{step?.instruction || 'Continue tout droit'}</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-sheet"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="h-1 bg-ink-fill rounded-t-2xl overflow-hidden">
          <div className="h-full bg-nawiy-green transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="max-w-md mx-auto px-4 pt-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold text-nawiy-600 leading-tight">{navEtaMin} min</div>
            <div className="text-sm text-ink-2">{fmtDist(navDistM)}{arrival && ` · arrivée ${arrival}`}</div>
          </div>
          <button onClick={onStop}
            className="h-12 px-6 bg-red-700 text-white text-base font-semibold rounded-full active:bg-red-800 flex-shrink-0">
            Quitter
          </button>
        </div>
      </motion.div>
    </>
  );
}
