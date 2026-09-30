import { motion } from 'framer-motion';

// Confirmation avant une action irréversible (ex. annuler une course)
export default function ConfirmDialog({ title, body, confirmLabel, cancelLabel = 'Non, garder', onConfirm, onCancel }) {
  return (
    <motion.div className="fixed inset-0 z-[70] bg-black/40 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel}>
      <motion.div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-2xl px-4 pt-5"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <h2 id="confirm-title" className="text-xl font-bold text-ink">{title}</h2>
        <p id="confirm-body" className="text-base text-ink-2 mt-1">{body}</p>
        <div className="flex flex-col gap-2 mt-5">
          <button onClick={onConfirm} autoFocus
            className="h-12 bg-red-700 text-white text-base font-semibold rounded-lg active:bg-red-800">
            {confirmLabel}
          </button>
          <button onClick={onCancel}
            className="h-12 bg-ink-fill text-ink text-base font-semibold rounded-lg active:bg-ink-line">
            {cancelLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
