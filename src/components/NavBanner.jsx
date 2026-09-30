import { motion, AnimatePresence } from 'framer-motion';

export default function NavBanner({ navActive, navSteps, navStepIdx, navDistM, navEtaMin, navRouteRef, onStop }) {
  if (!navActive || !navSteps.length) return null;

  const step = navSteps[navStepIdx];
  const icon = step?.type === 'arrive' ? '🏁'
    : step?.instruction?.includes('gauche') ? '⬅️'
    : step?.instruction?.includes('droite') ? '➡️' : '⬆️';

  const progress = Math.max(5, 100 - (navDistM / (navRouteRef.current?.distanceM || 1)) * 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -120 }} animate={{ y: 0 }} exit={{ y: -120 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="bg-nawiy-dark text-white px-4 pt-10 pb-3 shadow-2xl">
          <div className="flex items-start gap-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-nawiy-green flex items-center justify-center text-2xl flex-shrink-0">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base leading-tight">
                {step?.instruction || 'Continuez tout droit'}
              </div>
              <div className="text-white/60 text-sm mt-0.5">
                {step?.distanceM > 1000
                  ? `${(step.distanceM / 1000).toFixed(1)} km`
                  : `${step?.distanceM || 0} m`}
              </div>
            </div>
            <button onClick={onStop}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 flex-shrink-0">
              ✕
            </button>
          </div>
          <div className="mt-3 max-w-md mx-auto flex items-center gap-3">
            <div className="flex-1 bg-white/10 rounded-full h-1">
              <div className="bg-nawiy-green h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-white/50 flex-shrink-0">
              {navDistM > 1000 ? `${(navDistM / 1000).toFixed(1)} km` : `${navDistM} m`} · {navEtaMin} min
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
