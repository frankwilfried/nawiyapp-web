import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverDocsApi } from '../api/driverDocs.api';
import { compressImage } from '../lib/image';
import Icon from './Icon';

const STATUS = {
  missing:  { label: 'À envoyer',  cls: 'bg-ink-fill text-ink-2' },
  pending:  { label: 'Envoyée',    cls: 'bg-ink-fill text-ink' },
  approved: { label: 'Validée',    cls: 'bg-nawiy-light text-nawiy-600' },
  rejected: { label: 'À refaire',  cls: 'bg-red-50 text-red-700' },
};
const PHOTO_ONLY = new Set(['photo_chauffeur', 'photo_vehicule']);

function DocRow({ type, label, doc, locked, onPick, busy }) {
  const inputRef = useRef(null);
  const status = doc?.status || 'missing';
  const s = STATUS[status];
  return (
    <li className="flex items-center gap-3 py-3 border-b border-ink-line last:border-0">
      <span className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${status === 'approved' ? 'bg-nawiy-light text-nawiy-600' : 'bg-ink-fill text-ink'}`}>
        <Icon name={status === 'approved' ? 'check' : PHOTO_ONLY.has(type) ? 'smartphone' : 'route'} size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-base text-ink">{label}</div>
        <span className={`inline-block text-xs font-semibold rounded px-1.5 py-0.5 mt-0.5 ${s.cls}`}>{s.label}</span>
        {doc?.reject_reason && <p className="text-sm text-red-700 mt-0.5">{doc.reject_reason}</p>}
      </div>
      {!locked && (
        <>
          <input ref={inputRef} type="file" className="sr-only" aria-label={`Envoyer : ${label}`}
            accept={PHOTO_ONLY.has(type) ? 'image/*' : 'image/*,application/pdf'}
            capture={type === 'photo_chauffeur' ? 'user' : 'environment'}
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(type, f); }} />
          <button onClick={() => inputRef.current?.click()} disabled={busy}
            className="h-10 px-3 rounded-lg bg-ink-fill text-ink text-sm font-semibold active:bg-ink-line disabled:opacity-60 flex-shrink-0">
            {busy ? 'Envoi…' : doc && status !== 'rejected' ? 'Remplacer' : 'Envoyer'}
          </button>
        </>
      )}
    </li>
  );
}

/** Dossier du chauffeur : pièces à envoyer puis demande de validation. */
export default function DriverDocuments() {
  const qc = useQueryClient();
  const [busyType, setBusyType] = useState(null);
  const [error, setError] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['driver-docs'], queryFn: driverDocsApi.mine });

  const upload = useMutation({
    mutationFn: async ({ type, file }) => driverDocsApi.upload(type, await compressImage(file)),
    onMutate: ({ type }) => { setBusyType(type); setError(''); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver-docs'] }),
    onError: (e) => setError(e.response?.data?.error || 'Envoi impossible, réessaie'),
    onSettled: () => setBusyType(null),
  });
  const submit = useMutation({
    mutationFn: driverDocsApi.submit,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['driver-docs'] }),
    onError: (e) => setError(e.response?.data?.error || 'Envoi impossible, réessaie'),
  });

  if (isLoading || !data) return <div className="bg-white rounded-2xl p-5 text-ink-2" role="status">Chargement du dossier…</div>;

  const byType = Object.fromEntries(data.documents.map(d => [d.doc_type, d]));
  const locked = data.review_status === 'pending' || data.review_status === 'approved';
  const canSubmit = ['incomplete', 'rejected'].includes(data.review_status) && data.missing.length === 0;

  return (
    <section className="bg-white rounded-2xl p-4" aria-labelledby="docs-title">
      <h2 id="docs-title" className="text-lg font-bold text-ink">Ton dossier chauffeur</h2>

      {data.review_status === 'pending' && (
        <p className="text-sm text-ink bg-ink-fill rounded-lg px-3 py-2 mt-2" role="status">
          Dossier en cours de vérification. Tu pourras te mettre en ligne dès qu'il sera validé.
        </p>
      )}
      {data.review_status === 'rejected' && (
        <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-2" role="alert">
          Dossier refusé : {data.rejection_reason}. Renvoie les pièces marquées « À refaire ».
        </p>
      )}
      {data.review_status === 'incomplete' && (
        <p className="text-sm text-ink-2 mt-1">
          Envoie ces pièces pour pouvoir recevoir des courses. Photos nettes, bien éclairées, lisibles en entier.
        </p>
      )}

      <ul className="mt-2">
        {data.required.map(type => (
          <DocRow key={type} type={type} label={data.types[type]?.label || type} doc={byType[type]}
            locked={locked} busy={busyType === type}
            onPick={(t, file) => upload.mutate({ type: t, file })} />
        ))}
      </ul>

      {error && <p className="text-sm text-red-700 mt-2" role="alert">{error}</p>}

      {!locked && (
        <button onClick={() => submit.mutate()} disabled={!canSubmit || submit.isPending}
          className="w-full h-12 mt-3 bg-ink text-white text-base font-semibold rounded-lg disabled:bg-ink-fill disabled:text-ink-3">
          {data.missing.length ? `Encore ${data.missing.length} pièce${data.missing.length > 1 ? 's' : ''} à envoyer` : 'Envoyer mon dossier pour validation'}
        </button>
      )}
      <p className="text-xs text-ink-2 mt-2">Tes pièces sont privées : seule l'équipe NawiyApp les consulte, pour vérifier ton identité.</p>
    </section>
  );
}
