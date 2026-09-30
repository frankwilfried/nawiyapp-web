import { motion } from 'framer-motion';
import Icon from './Icon';

// Numéros d'urgence au Cameroun
const EMERGENCY = [
  { label: 'Police', number: '117' },
  { label: 'Sapeurs-pompiers', number: '118' },
];

export default function SafetySheet({ onShare, onClose }) {
  const row = 'w-full flex items-center gap-4 py-3 border-b border-ink-line text-left active:bg-ink-fill -mx-2 px-2 rounded-lg';
  return (
    <motion.div className="fixed inset-0 z-[70] bg-black/40 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="safety-title"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-2xl px-4 pt-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between mb-1">
          <h2 id="safety-title" className="text-xl font-bold text-ink">Sécurité</h2>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-ink-2 active:bg-ink-fill">
            <Icon name="x" size={20} />
          </button>
        </div>
        <p className="text-sm text-ink-2 mb-2">Vérifie toujours la plaque avant de monter, et ne donne ton code qu'au bon chauffeur.</p>
        <button onClick={() => { onShare(); onClose(); }} className={row}>
          <span className="w-10 h-10 rounded-full bg-ink-fill text-ink flex items-center justify-center"><Icon name="share" size={18} /></span>
          <span><span className="block text-base text-ink">Partager mon trajet</span><span className="block text-sm text-ink-2">Chauffeur, plaque et destination par WhatsApp</span></span>
        </button>
        {EMERGENCY.map(e => (
          <a key={e.number} href={`tel:${e.number}`} className={row}>
            <span className="w-10 h-10 rounded-full bg-red-50 text-red-700 flex items-center justify-center"><Icon name="phone" size={18} /></span>
            <span><span className="block text-base text-ink">Appeler {e.label.toLowerCase() === 'police' ? 'la police' : 'les sapeurs-pompiers'}</span><span className="block text-sm text-ink-2">{e.number}</span></span>
          </a>
        ))}
      </motion.div>
    </motion.div>
  );
}
