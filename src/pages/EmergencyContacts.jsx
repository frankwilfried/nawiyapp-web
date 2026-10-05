import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { accountApi } from '../api/account.api';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';

const inputCls = 'w-full h-12 border border-ink-line rounded-lg px-3 text-base text-ink focus:outline-none focus:border-ink';

/** Jusqu'à 3 proches prévenus par SMS (depuis ton téléphone) avec le lien de suivi de ta course. */
export default function EmergencyContacts() {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const { data } = useQuery({ queryKey: ['emergency-contacts'], queryFn: accountApi.contacts, enabled: isAuthenticated });
  const [edited, setList] = useState(null);
  const [saved, setSaved] = useState(false);
  // Liste du serveur tant que rien n'est modifié, puis la version en cours d'édition
  const list = edited ?? (data ? (data.length ? data : [{ name: '', phone: '' }]) : null);

  const save = useMutation({
    mutationFn: () => accountApi.setContacts(list.filter(c => c.name.trim() || c.phone.trim())),
    onSuccess: (contacts) => { qc.setQueryData(['emergency-contacts'], contacts); setList(contacts.length ? contacts : [{ name: '', phone: '' }]); setSaved(true); },
  });
  if (!isAuthenticated) return <Navigate to="/login?next=/compte/urgence" replace />;

  const update = (i, field, value) => { setSaved(false); setList(list.map((c, j) => (j === i ? { ...c, [field]: value } : c))); };

  return (
    <div className="min-h-screen bg-white">
      <PageHeader title="Contacts d'urgence" back="/compte" />
      <main className="max-w-md mx-auto px-4 py-5">
        <p className="text-base text-ink-2">
          Pendant une course, le bouton <span className="font-semibold text-ink">Sécurité</span> te permet de leur envoyer en un geste
          un SMS avec le lien pour suivre ta course en direct. Le SMS part de ton téléphone.
        </p>
        {list && (
          <form onSubmit={e => { e.preventDefault(); save.mutate(); }} className="flex flex-col gap-4 mt-5">
            {list.map((c, i) => (
              <fieldset key={i} className="flex flex-col gap-2 border border-ink-line rounded-xl p-3">
                <legend className="text-sm font-semibold text-ink px-1">Contact {i + 1}</legend>
                <input value={c.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Nom (ex. Maman)"
                  aria-label={`Nom du contact ${i + 1}`} maxLength={60} className={inputCls} />
                <input value={c.phone} onChange={e => update(i, 'phone', e.target.value)} placeholder="6 90 12 34 56" type="tel"
                  inputMode="tel" aria-label={`Téléphone du contact ${i + 1}`} className={inputCls} />
                <button type="button" onClick={() => { setSaved(false); setList(list.filter((_, j) => j !== i)); }}
                  className="self-start h-10 text-sm font-semibold text-red-700">Retirer</button>
              </fieldset>
            ))}
            {list.length < 3 && (
              <button type="button" onClick={() => setList([...list, { name: '', phone: '' }])}
                className="h-12 rounded-lg bg-ink-fill text-ink font-semibold flex items-center justify-center gap-2">
                <Icon name="users" size={18} /> Ajouter un contact
              </button>
            )}
            {save.isError && <p role="alert" className="text-sm text-red-700">{save.error.response?.data?.error || 'Enregistrement impossible'}</p>}
            {saved && <p role="status" className="text-sm text-nawiy-600 font-semibold">Contacts enregistrés</p>}
            <button type="submit" disabled={save.isPending} className="h-12 bg-ink text-white rounded-lg font-semibold disabled:opacity-60">
              {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
