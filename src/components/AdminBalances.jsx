import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { CATEGORIES } from '../lib/pricing';

const F = (n) => `${Math.abs(Number(n || 0)).toLocaleString('fr-FR')} F`;

function SettleForm({ driver, onDone, onCancel }) {
  const owes = driver.balance < 0;
  const [amount, setAmount] = useState(String(Math.abs(driver.balance) || ''));
  const [note, setNote] = useState('');
  const settle = useMutation({
    // Le chauffeur paie ce qu'il doit (+), ou NawiyApp le paie (−)
    mutationFn: () => apiClient.post(`/taxi/admin/drivers/${driver.id}/settlement`, { amount: (owes ? 1 : -1) * Number(amount), note }),
    onSuccess: onDone,
  });
  return (
    <form onSubmit={e => { e.preventDefault(); settle.mutate(); }} className="mt-2 flex flex-col gap-2 bg-gray-50 rounded-lg p-3">
      <p className="text-sm font-semibold text-gray-800">{owes ? `${driver.name} a payé NawiyApp` : `NawiyApp a payé ${driver.name}`}</p>
      <label className="text-sm text-gray-700">Montant (F)
        <input type="number" min="1" step="1" required value={amount} onChange={e => setAmount(e.target.value)}
          className="mt-1 w-full h-11 border border-gray-300 rounded-lg px-3" />
      </label>
      <label className="text-sm text-gray-700">Référence (reçu MoMo, espèces, date…)
        <input required maxLength={200} value={note} onChange={e => setNote(e.target.value)}
          className="mt-1 w-full h-11 border border-gray-300 rounded-lg px-3" />
      </label>
      {settle.isError && <p className="text-sm text-red-700" role="alert">{settle.error.response?.data?.error || 'Erreur'}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={settle.isPending || !Number(amount) || !note.trim()}
          className="flex-1 h-11 bg-black text-white rounded-lg font-semibold disabled:opacity-50">Enregistrer</button>
        <button type="button" onClick={onCancel} className="flex-1 h-11 bg-white border border-gray-300 rounded-lg font-semibold">Annuler</button>
      </div>
    </form>
  );
}

/** Soldes des chauffeurs (commission 10 %) et saisie des règlements. */
export default function AdminBalances() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin-balances'], queryFn: () => apiClient.get('/taxi/admin/balances').then(r => r.data) });
  if (isLoading || !data) return <p className="text-gray-500" role="status">Chargement…</p>;
  const totalOwed = data.drivers.filter(d => d.balance < 0).reduce((s, d) => s - d.balance, 0);

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
        <p className="text-sm text-gray-600">Dû par les chauffeurs à NawiyApp</p>
        <p className="text-2xl font-bold text-gray-900">{F(totalOwed)}</p>
        <p className="text-xs text-gray-500 mt-1">Au-delà de {F(data.limit)} dus, un chauffeur ne peut plus se mettre en ligne.</p>
      </div>
      {data.drivers.length === 0 && <p className="text-gray-500">Aucun chauffeur validé pour l'instant.</p>}
      <ul className="flex flex-col gap-2">
        {data.drivers.map(d => (
          <li key={d.id} className="bg-white rounded-xl shadow-sm p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{d.full_name}</p>
                <p className="text-xs text-gray-500">{CATEGORIES[d.category]?.label} · {d.plate || (d.visible_number && `N° ${d.visible_number}`)} · {d.phone}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`font-bold ${d.balance < -data.limit ? 'text-red-700' : 'text-gray-900'}`}>
                  {d.balance === 0 ? '0 F' : d.balance < 0 ? `doit ${F(d.balance)}` : `à payer ${F(d.balance)}`}
                </p>
                {d.balance !== 0 && open !== d.id && (
                  <button onClick={() => setOpen(d.id)} className="text-sm font-semibold text-nawiy-600 underline">Saisir un règlement</button>
                )}
              </div>
            </div>
            {open === d.id && (
              <SettleForm driver={d} onCancel={() => setOpen(null)}
                onDone={() => { setOpen(null); qc.invalidateQueries({ queryKey: ['admin-balances'] }); }} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
