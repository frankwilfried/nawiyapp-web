import { motion } from 'framer-motion';
import Icon from './Icon';
import { CATEGORIES } from '../lib/pricing';

// Épingle fixe au centre visible de la carte (au-dessus de la fiche de hauteur bottomPad) :
// la pointe correspond exactement à map.getCenter() quand la carte a ce padding.
export function CenterPin({ moving, bottomPad = 0 }) {
  return (
    <div className="fixed left-1/2 z-30 pointer-events-none" aria-hidden="true"
      style={{ top: `calc(50% - ${bottomPad / 2}px)`, transform: 'translate(-50%, calc(-100% + 6px))' }}>
      <div className={`flex flex-col items-center transition-transform duration-150 ${moving ? '-translate-y-2' : ''}`}>
        <div className="bg-ink text-white text-xs font-semibold rounded-md px-2 py-1 whitespace-nowrap">Prise en charge</div>
        <div className="w-0.5 h-5 bg-ink" />
        <div className="w-3 h-3 rounded-full bg-ink ring-4 ring-white" />
      </div>
    </div>
  );
}

// Confirmation du point de prise en charge, étape obligatoire avant de commander (comme Uber)
export default function PickupSheet({ label, hint, category, price, onConfirm, onBack }) {
  return (
    <motion.section initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 34, stiffness: 320 }}
      className="fixed bottom-0 left-0 right-0 z-[45] bg-white rounded-t-2xl shadow-sheet mx-auto max-w-md px-4 pt-3"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }} aria-labelledby="pickup-title">
      <div className="flex items-center gap-2">
        <button onClick={onBack} aria-label="Retour au choix de la course"
          className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-ink active:bg-ink-fill">
          <Icon name="arrowLeft" size={22} />
        </button>
        <h2 id="pickup-title" className="text-lg font-bold text-ink">Où le chauffeur te prend ?</h2>
      </div>
      <p className="text-sm text-ink-2 mb-3">Déplace la carte pour placer l'épingle au bon endroit.</p>
      <div className="flex items-center gap-3 bg-ink-fill rounded-lg px-3 py-3">
        <Icon name="pin" size={20} className="text-ink flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-base font-semibold text-ink truncate">{label}</div>
          {hint && <div className="text-sm text-ink-2 truncate">{hint}</div>}
        </div>
      </div>
      <button onClick={onConfirm} className="w-full h-12 mt-3 bg-ink text-white text-base font-semibold rounded-lg active:bg-gray-800">
        Confirmer · {CATEGORIES[category]?.label} · {price?.toLocaleString('fr-FR')} FCFA
      </button>
    </motion.section>
  );
}
