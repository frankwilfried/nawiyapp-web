import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import Icon from './Icon';

const fcfa = (n) => `${Math.abs(Number(n || 0)).toLocaleString('fr-FR')} F`;
const TYPE_LABELS = {
  commission: 'Commission 10 %',
  mobile_payment: 'Course payée par Mobile Money',
  fee_collected: "Frais d'annulation encaissés",
  cancellation_fee: "Frais d'annulation pour toi",
  settlement: 'Règlement',
  adjustment: 'Correction',
};

/**
 * Solde du chauffeur envers NawiyApp : commissions dues sur les courses en espèces,
 * montants que NawiyApp lui doit (Mobile Money, frais d'annulation).
 */
export default function DriverBalance({ refreshKey }) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['driver-balance', refreshKey],
    queryFn: () => apiClient.get('/taxi/drivers/me/balance').then(r => r.data),
  });
  if (!data) return null;

  const owes = data.balance < 0;
  const nearLimit = owes && -data.balance >= data.limit * 0.8;
  const blocked = owes && -data.balance > data.limit;

  return (
    <section className="bg-white rounded-2xl p-4" aria-labelledby="balance-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="balance-title" className="text-sm text-ink-2">
            {data.balance === 0 ? 'Ton solde NawiyApp' : owes ? 'Tu dois à NawiyApp' : 'NawiyApp te doit'}
          </h2>
          <p className={`text-2xl font-bold ${blocked ? 'text-red-700' : 'text-ink'}`}>{fcfa(data.balance)}</p>
        </div>
        {data.entries.length > 0 && (
          <button onClick={() => setOpen(o => !o)} aria-expanded={open}
            className="h-10 px-3 rounded-lg bg-ink-fill text-ink text-sm font-semibold flex items-center gap-1">
            Détail <Icon name="chevronRight" size={16} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {(nearLimit || blocked) && (
        <p className={`text-sm rounded-lg px-3 py-2 mt-2 ${blocked ? 'bg-red-50 text-red-700' : 'bg-amber-100 text-amber-900'}`} role="status">
          {blocked
            ? `Au-delà de ${fcfa(data.limit)} dus, tu ne reçois plus de courses. Règle ton solde auprès de NawiyApp.`
            : `Attention : au-delà de ${fcfa(data.limit)} dus, tu ne recevras plus de courses.`}
        </p>
      )}
      {data.entries.length === 0 && (
        <p className="text-sm text-ink-2 mt-1">10 % de chaque course reviennent à NawiyApp. Ton solde s'affichera ici après ta première course.</p>
      )}

      {open && (
        <ul className="mt-3 divide-y divide-ink-line">
          {data.entries.map(e => (
            <li key={e.id} className="flex items-center justify-between py-2 gap-3">
              <div className="min-w-0">
                <p className="text-sm text-ink truncate">{TYPE_LABELS[e.type] || e.type}{e.ride_id ? ` · course #${e.ride_id}` : ''}</p>
                <p className="text-xs text-ink-2">{new Date(e.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <span className={`text-sm font-semibold whitespace-nowrap ${e.amount < 0 ? 'text-ink' : 'text-nawiy-600'}`}>
                {e.amount < 0 ? '−' : '+'}{fcfa(e.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
