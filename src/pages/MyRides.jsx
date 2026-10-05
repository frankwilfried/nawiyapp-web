import { Link, Navigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { accountApi } from '../api/account.api';
import { CATEGORIES } from '../lib/pricing';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import { RIDE_STATUS, rideDate, rideTotal } from '../lib/rides';


/** Historique des courses du passager connecté. */
export default function MyRides() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['my-rides'],
    queryFn: ({ pageParam }) => accountApi.rides(pageParam),
    initialPageParam: null,
    getNextPageParam: (last) => last.next,
    enabled: isAuthenticated,
  });
  if (!isAuthenticated) return <Navigate to="/login?next=/courses" replace />;
  const rides = data?.pages.flatMap(p => p.rides) || [];

  return (
    <div className="min-h-screen bg-white">
      <PageHeader title="Mes courses" back="/compte" />
      <main className="max-w-2xl mx-auto">
        {isLoading && <p className="p-4 text-ink-2" role="status">Chargement…</p>}
        {isError && <p className="p-4 text-red-700" role="alert">Impossible de charger tes courses. Réessaie.</p>}
        {data && rides.length === 0 && (
          <div className="px-6 py-16 text-center">
            <Icon name="taxi" size={40} className="mx-auto text-ink-3" />
            <p className="text-base text-ink mt-3">Aucune course pour l'instant</p>
            <p className="text-sm text-ink-2 mt-1">Tes courses commandées avec ce compte apparaîtront ici.</p>
          </div>
        )}
        <ul className="divide-y divide-ink-line">
          {rides.map(r => (
            <li key={r.id}>
              <Link to={`/courses/${r.id}`} className="flex items-start gap-3 px-4 py-3 active:bg-ink-fill">
                <span className="w-10 h-10 rounded-full bg-ink-fill text-ink flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon name={r.category === 'moto' ? 'bike' : 'car'} size={20} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-semibold text-ink truncate">{r.to_name}</span>
                  <span className="block text-sm text-ink-2">{rideDate(r.scheduled_at && r.status === 'scheduled' ? r.scheduled_at : r.created_at)} · {CATEGORIES[r.category]?.label.replace('Nawiy ', '')}</span>
                  {r.status !== 'completed' && (
                    <span className={`inline-block text-xs font-semibold rounded px-1.5 py-0.5 mt-1 ${r.status === 'cancelled' ? 'bg-ink-fill text-ink-2' : r.status === 'scheduled' ? 'bg-amber-100 text-amber-900' : 'bg-nawiy-light text-nawiy-600'}`}>
                      {RIDE_STATUS[r.status] || r.status}
                    </span>
                  )}
                </span>
                <span className="text-base font-semibold text-ink whitespace-nowrap">
                  {rideTotal(r) ? `${rideTotal(r).toLocaleString('fr-FR')} F` : '—'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {hasNextPage && (
          <div className="p-4">
            <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
              className="w-full h-12 bg-ink-fill text-ink font-semibold rounded-lg disabled:opacity-60">
              {isFetchingNextPage ? 'Chargement…' : 'Voir plus'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
