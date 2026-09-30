import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Icon from './Icon';

// Au plus 2 clignotements par seconde (sous le seuil de 3 flashs/s des règles d'accessibilité)
const BLINK_S = { lent: 1.4, rapide: 0.5 };

/**
 * Écran plein, couleur vive + numéro : le passager lève son téléphone, le chauffeur affiche
 * le même signal sur son guidon ou son tableau de bord. Garde l'écran allumé tant qu'il est ouvert.
 */
export default function SignalScreen({ signal, title, subtitle, onClose }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    let lock;
    navigator.wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, []);

  if (!signal) return null;
  const blink = reduce ? null : BLINK_S[signal.blink]; // « réduire les animations » : signal fixe, rythme écrit

  return (
    <motion.div role="dialog" aria-modal="true" aria-label={`Signal ${signal.name} ${signal.number}`}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center text-center select-none"
      style={{ background: signal.hex, color: signal.text }}
      initial={{ opacity: 0 }} animate={blink ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
      transition={blink ? { duration: blink, repeat: Infinity, ease: 'linear' } : { duration: 0.2 }}>
      <p className="text-lg font-semibold px-6">{title}</p>
      <div className="font-black leading-none my-4" style={{ fontSize: 'min(42vw, 14rem)' }}>{signal.number}</div>
      <p className="text-3xl font-black tracking-widest">{signal.name}</p>
      {signal.blink !== 'fixe' && <p className="text-base font-semibold mt-2">Clignotement {signal.blink}</p>}
      {subtitle && <p className="text-base mt-6 px-8 max-w-sm">{subtitle}</p>}
      <button onClick={onClose}
        className="absolute left-1/2 -translate-x-1/2 h-12 px-6 rounded-full font-semibold flex items-center gap-2"
        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))', background: signal.text, color: signal.hex }}>
        <Icon name="x" size={18} /> Fermer le signal
      </button>
    </motion.div>
  );
}

/** Pastille compacte « ● ORANGE 47 » pour les fiches. */
export function SignalBadge({ signal, size = 'md' }) {
  if (!signal) return null;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full font-bold ${size === 'lg' ? 'px-4 h-10 text-base' : 'px-3 h-8 text-sm'}`}
      style={{ background: signal.hex, color: signal.text, boxShadow: signal.id === 'blanc' ? 'inset 0 0 0 1px #E2E2E2' : undefined }}>
      {signal.name} {signal.number}
    </span>
  );
}
