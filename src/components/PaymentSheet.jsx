import { useState } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';
import { cmPhoneSchema } from '../lib/schemas';

const ICONS = { cash: 'cash', momo: 'smartphone', orange_money: 'smartphone' };
const BADGE = { momo: { bg: '#FFCC00', fg: '#000', txt: 'MoMo' }, orange_money: { bg: '#FF7900', fg: '#000', txt: 'OM' } };

export function PaymentIcon({ method, size = 20 }) {
  const b = BADGE[method];
  if (!b) return <Icon name={ICONS[method] || 'cash'} size={size} />;
  return (
    <span className="inline-flex items-center justify-center rounded text-[10px] font-bold leading-none px-1"
      style={{ background: b.bg, color: b.fg, height: size, minWidth: size }} aria-hidden="true">{b.txt}</span>
  );
}

// Choix du moyen de paiement, façon Uber / Yango
export default function PaymentSheet({ methods, value, onChange, onClose }) {
  const [method, setMethod] = useState(value.method);
  const [phone, setPhone]   = useState(value.phone || '');
  const [error, setError]   = useState('');
  const current = methods.find(m => m.id === method);

  const save = () => {
    if (current?.needs_phone) {
      const r = cmPhoneSchema.safeParse(phone);
      if (!r.success) { setError(r.error.issues[0].message); return; }
      onChange({ method, phone: r.data });
    } else {
      onChange({ method, phone: '' });
    }
    onClose();
  };

  return (
    <motion.div className="fixed inset-0 z-[70] bg-black/40 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="pay-title"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-2xl px-4 pt-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 id="pay-title" className="text-xl font-bold text-ink">Paiement</h2>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-ink-2 active:bg-ink-fill">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div role="radiogroup" aria-label="Moyen de paiement">
          {methods.map(m => (
            <button key={m.id} role="radio" aria-checked={method === m.id} disabled={!m.available}
              onClick={() => { setMethod(m.id); setError(''); }}
              className="w-full flex items-center gap-4 py-3 border-b border-ink-line last:border-0 text-left disabled:opacity-100">
              <span className={`w-10 h-10 rounded-full bg-ink-fill flex items-center justify-center flex-shrink-0 ${m.available ? 'text-ink' : 'text-ink-3'}`}>
                <PaymentIcon method={m.id} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-base ${m.available ? 'text-ink' : 'text-ink-3'}`}>{m.label}</span>
                {!m.available && <span className="block text-sm text-ink-2">Bientôt disponible</span>}
              </span>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === m.id ? 'border-ink' : 'border-ink-3'}`} aria-hidden="true">
                {method === m.id && <span className="w-2.5 h-2.5 rounded-full bg-ink" />}
              </span>
            </button>
          ))}
        </div>

        {current?.needs_phone && (
          <label className="block mt-4 text-sm font-semibold text-ink">
            Numéro {current.label}
            <input type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder="6 90 12 34 56"
              onChange={e => { setPhone(e.target.value); setError(''); }}
              aria-invalid={!!error} aria-describedby={error ? 'pay-err' : 'pay-help'}
              className="mt-1 w-full h-12 bg-ink-fill rounded-lg px-3 text-base font-normal text-ink outline-none focus:ring-2 focus:ring-ink" />
            {error
              ? <span id="pay-err" role="alert" className="block text-sm font-normal text-red-700 mt-1">{error}</span>
              : <span id="pay-help" className="block text-sm font-normal text-ink-2 mt-1">Tu confirmeras le paiement sur ton téléphone à la fin de la course.</span>}
          </label>
        )}

        <button onClick={save} className="w-full h-12 mt-4 bg-ink text-white text-base font-semibold rounded-lg active:bg-gray-800">
          Valider
        </button>
      </motion.div>
    </motion.div>
  );
}
