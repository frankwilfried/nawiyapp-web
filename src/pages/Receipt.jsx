import { Navigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { accountApi } from '../api/account.api';
import { CATEGORIES } from '../lib/pricing';
import { PaymentIcon } from '../components/PaymentSheet';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import { RIDE_STATUS, rideDate } from '../lib/rides';

const PAY_LABELS = { cash: 'Espèces', momo: 'MTN MoMo', orange_money: 'Orange Money' };
const F = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const time = (d) => d && new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function Line({ label, value, strong }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 ${strong ? 'text-lg font-bold text-ink border-t border-ink-line mt-2 pt-3' : 'text-base text-ink'}`}>
      <span className={strong ? '' : 'text-ink-2'}>{label}</span><span className="text-right">{value}</span>
    </div>
  );
}

/** Reçu d'une course, imprimable (Ctrl+P / Partager → Imprimer en PDF). */
export default function Receipt() {
  const { id } = useParams();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const qc = useQueryClient();
  const { data: r, isLoading, isError } = useQuery({ queryKey: ['receipt', id], queryFn: () => accountApi.receipt(id), enabled: isAuthenticated });
  const cancel = useMutation({
    mutationFn: () => accountApi.cancelScheduled(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['receipt', id] }); qc.invalidateQueries({ queryKey: ['my-rides'] }); },
  });
  if (!isAuthenticated) return <Navigate to={`/login?next=/courses/${id}`} replace />;

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden">
        <PageHeader title="Reçu" back="/courses">
          {r && (
            <button onClick={() => window.print()} aria-label="Imprimer ou enregistrer en PDF"
              className="h-10 px-3 rounded-lg bg-ink-fill text-ink text-sm font-semibold flex items-center gap-1.5">
              <Icon name="share" size={16} /> PDF
            </button>
          )}
        </PageHeader>
      </div>
      <main className="max-w-md mx-auto px-4 py-5">
        {isLoading && <p className="text-ink-2" role="status">Chargement…</p>}
        {isError && <p className="text-red-700" role="alert">Reçu introuvable.</p>}
        {r && (
          <article>
            <p className="text-sm font-bold tracking-widest text-nawiy-600">NAWIYAPP</p>
            <h2 className="text-2xl font-bold text-ink mt-1">{F(r.total)}</h2>
            <p className="text-sm text-ink-2">{rideDate(r.created_at)} · Course n° {r.id} · {RIDE_STATUS[r.status] || r.status}</p>

            <div className="flex gap-3 mt-5">
              <div className="flex flex-col items-center pt-2" aria-hidden="true">
                <span className="w-2 h-2 rounded-full bg-ink" /><span className="w-px flex-1 bg-ink my-1" /><span className="w-2 h-2 bg-ink" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base text-ink">{r.from_name}</p>
                <p className="text-sm text-ink-2">{time(r.started_at || r.accepted_at || r.created_at)}</p>
                <p className="text-base font-semibold text-ink mt-3">{r.to_name}</p>
                {r.completed_at && <p className="text-sm text-ink-2">{time(r.completed_at)}</p>}
              </div>
            </div>

            {r.status === 'scheduled' && (
              <div className="mt-4 rounded-lg bg-amber-100 text-amber-900 px-3 py-3">
                <p className="text-sm font-semibold">
                  Programmée pour {new Date(r.scheduled_at).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm">On cherche ton chauffeur 15 min avant et on te prévient. Annulation gratuite jusque-là.</p>
                <button onClick={() => cancel.mutate()} disabled={cancel.isPending}
                  className="mt-2 h-10 px-4 rounded-lg bg-white text-red-700 text-sm font-semibold disabled:opacity-50 print:hidden">
                  {cancel.isPending ? 'Annulation…' : 'Annuler la course'}
                </button>
                {cancel.isError && <p className="text-sm text-red-700 mt-1" role="alert">{cancel.error.response?.data?.error || 'Annulation impossible'}</p>}
              </div>
            )}

            <section className="mt-6" aria-label="Détail du prix">
              {r.status === 'cancelled' ? (
                <>
                  <Line label="Course annulée" value={r.cancelled_by === 'no_show' ? 'passager absent' : 'par le passager'} />
                  <Line label="Frais d'annulation" value={F(r.cancellation_fee)} strong />
                </>
              ) : (
                <>
                  <Line label={`${CATEGORIES[r.category]?.label} · ${String(r.distance_km).replace('.', ',')} km`} value={F(r.final_price || r.proposed_price)} />
                  {r.fee_included > 0 && <Line label="Frais d'annulation précédents" value={F(r.fee_included)} />}
                  {r.tip_fcfa > 0 && <Line label="Pourboire" value={F(r.tip_fcfa)} />}
                  <Line label="Total" value={F(r.total)} strong />
                </>
              )}
              <div className="flex items-center gap-2 text-sm text-ink-2 mt-2">
                <PaymentIcon method={r.payment_method} size={16} /> {PAY_LABELS[r.payment_method] || r.payment_method}
                {r.payment_status === 'paid' && ' · payé'}
              </div>
            </section>

            {r.driver_name && (
              <section className="mt-6 border-t border-ink-line pt-4" aria-label="Chauffeur">
                <p className="text-base text-ink">Chauffeur : <span className="font-semibold">{r.driver_name}</span></p>
                <p className="text-sm text-ink-2">
                  {[[r.vehicle_model, r.vehicle_color].filter(Boolean).join(' '), r.plate, r.visible_number && `N° ${r.visible_number}`].filter(Boolean).join(' · ')}
                </p>
                {r.my_rating && <p className="text-sm text-ink-2 mt-1 flex items-center gap-1">Ta note : <Icon name="star" size={14} filled /> {r.my_rating}</p>}
              </section>
            )}
            <p className="text-xs text-ink-3 mt-8">NawiyApp met en relation passagers et chauffeurs indépendants. Ce reçu n'est pas une facture.</p>
          </article>
        )}
      </main>
    </div>
  );
}
