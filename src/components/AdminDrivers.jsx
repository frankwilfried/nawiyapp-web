import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverDocsApi } from '../api/driverDocs.api';
import { CATEGORIES } from '../lib/pricing';

const FILTERS = [
  ['pending', 'À contrôler'], ['rejected', 'Refusés'], ['approved', 'Validés'], ['incomplete', 'Incomplets'],
];

// Vignette d'une pièce : chargée avec le jeton admin (les fichiers ne sont jamais publics)
function DocThumb({ driverId, doc, label }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let objectUrl;
    driverDocsApi.adminFile(driverId, doc.doc_type)
      .then(blob => { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); })
      .catch(() => setFailed(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [driverId, doc.doc_type, doc.uploaded_at]);

  const isPdf = doc.content_type === 'application/pdf';
  return (
    <a href={url || undefined} target="_blank" rel="noreferrer"
      className="block rounded-lg border border-gray-200 overflow-hidden bg-gray-50 hover:border-gray-400"
      aria-label={`Ouvrir : ${label}`}>
      <div className="aspect-[4/3] flex items-center justify-center text-xs text-gray-500">
        {failed ? 'Erreur' : !url ? '…' : isPdf ? 'PDF — ouvrir' : <img src={url} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="px-2 py-1 text-xs font-medium text-gray-700 truncate">{label}</div>
      {doc.status === 'rejected' && <div className="px-2 pb-1 text-xs text-red-700 truncate">Refusée : {doc.reject_reason}</div>}
    </a>
  );
}

function DriverCard({ d, types, onDone }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [badDocs, setBadDocs] = useState({});
  const [error, setError] = useState('');
  const approve = useMutation({ mutationFn: () => driverDocsApi.approve(d.id), onSuccess: onDone, onError: e => setError(e.response?.data?.error || 'Erreur') });
  const reject = useMutation({
    mutationFn: () => driverDocsApi.reject(d.id, reason, Object.fromEntries(Object.entries(badDocs).filter(([, v]) => v !== false).map(([k, v]) => [k, v || reason.trim()]))),
    onSuccess: onDone, onError: e => setError(e.response?.data?.error || 'Erreur'),
  });

  return (
    <article className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">{d.name || d.email}</h3>
          <p className="text-sm text-gray-600">
            {CATEGORIES[d.category]?.label} · {[d.vehicle_model, d.vehicle_color].filter(Boolean).join(' ')}
            {d.helmet_color ? ` · casque ${d.helmet_color}` : ''}
          </p>
          <p className="text-sm text-gray-600">
            {d.plate ? `Plaque ${d.plate}` : 'Sans plaque'}{d.visible_number ? ` · N° visible ${d.visible_number}` : ''} · {d.phone} · {d.email}
          </p>
          {d.submitted_at && <p className="text-xs text-gray-500 mt-0.5">Envoyé le {new Date(d.submitted_at).toLocaleString('fr-FR')}</p>}
          {d.rejection_reason && <p className="text-sm text-red-700 mt-1">Refus : {d.rejection_reason}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
        {d.documents.map(doc => <DocThumb key={doc.doc_type} driverId={d.id} doc={doc} label={types[doc.doc_type]?.label || doc.doc_type} />)}
      </div>

      {error && <p className="text-sm text-red-700 mt-2" role="alert">{error}</p>}

      {d.review_status === 'pending' && !rejecting && (
        <div className="flex gap-2 mt-3">
          <button onClick={() => approve.mutate()} disabled={approve.isPending}
            className="flex-1 h-11 rounded-lg bg-black text-white font-semibold disabled:opacity-50">Valider le chauffeur</button>
          <button onClick={() => setRejecting(true)} className="flex-1 h-11 rounded-lg bg-gray-100 text-gray-900 font-semibold">Refuser…</button>
        </div>
      )}
      {d.review_status === 'approved' && !rejecting && (
        <button onClick={() => setRejecting(true)} className="mt-3 h-10 px-4 rounded-lg bg-gray-100 text-red-700 text-sm font-semibold">Suspendre ce chauffeur…</button>
      )}

      {rejecting && (
        <form className="mt-3 flex flex-col gap-2" onSubmit={e => { e.preventDefault(); if (reason.trim()) reject.mutate(); }}>
          <label className="text-sm font-semibold text-gray-800">Raison (visible par le chauffeur)
            <input value={reason} onChange={e => setReason(e.target.value)} maxLength={300} required
              placeholder="Permis illisible, photo floue…"
              className="mt-1 w-full h-11 border border-gray-300 rounded-lg px-3 font-normal" />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-gray-800">Pièces à refaire</legend>
            <div className="flex flex-wrap gap-2 mt-1">
              {d.documents.map(doc => (
                <label key={doc.doc_type} className="flex items-center gap-1.5 text-sm bg-gray-50 rounded-lg px-2 py-1">
                  <input type="checkbox" checked={badDocs[doc.doc_type] !== undefined && badDocs[doc.doc_type] !== false}
                    onChange={e => setBadDocs(b => ({ ...b, [doc.doc_type]: e.target.checked ? '' : false }))} />
                  {types[doc.doc_type]?.label || doc.doc_type}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button type="submit" disabled={!reason.trim() || reject.isPending}
              className="flex-1 h-11 rounded-lg bg-red-700 text-white font-semibold disabled:opacity-50">Confirmer le refus</button>
            <button type="button" onClick={() => setRejecting(false)} className="flex-1 h-11 rounded-lg bg-gray-100 font-semibold">Annuler</button>
          </div>
        </form>
      )}
    </article>
  );
}

export default function AdminDrivers() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-drivers', status],
    queryFn: () => driverDocsApi.adminList(status),
    refetchInterval: 30000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-drivers'] });

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Statut des dossiers">
        {FILTERS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={status === id} onClick={() => setStatus(id)}
            className={`h-9 px-3 rounded-full text-sm font-semibold ${status === id ? 'bg-black text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>
      {isLoading && <p className="text-gray-500" role="status">Chargement…</p>}
      {isError && <p className="text-red-700" role="alert">Impossible de charger les dossiers.</p>}
      {data && !data.drivers.length && <p className="text-gray-500">Aucun dossier dans cette catégorie.</p>}
      <div className="flex flex-col gap-3">
        {data?.drivers.map(d => <DriverCard key={d.id} d={d} types={data.types} onDone={refresh} />)}
      </div>
    </div>
  );
}
