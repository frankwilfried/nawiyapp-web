import Icon from './Icon';
import { t } from '../i18n';

// Clés traduites à l'affichage
const TAXI_STATUS = {
  searching:      "Recherche d'un chauffeur…",
  driver_found:   'Chauffeur en route',
  driver_arrived: 'Ton chauffeur est arrivé',
  in_progress:    'Course en cours',
  completed:      'Course terminée',
};

// Raccourcis sous la barre : favoris d'abord, puis récents, sans doublons
function quickPlaces(favorites, recents) {
  const seen = new Set();
  const out = [];
  for (const [list, kind] of [[favorites, 'fav'], [recents, 'recent']]) {
    for (const p of list) {
      if (seen.has(p.id) || !p.lat) continue;
      seen.add(p.id); out.push({ place: p, kind });
    }
  }
  return out.slice(0, 5);
}

export default function SearchBar({
  result, fromText, toText, fromNode, toNode, taxiMode, taxiEta,
  favorites = [], recents = [],
  onOpen, onOpenSheet, onClear, onQuickDestination,
}) {
  // ── Trajet affiché : carte blanche départ → arrivée ────────────────
  if (result) {
    const taxiStatus = TAXI_STATUS[taxiMode] && t(TAXI_STATUS[taxiMode]);
    return (
      <div className="mx-auto max-w-md flex flex-col items-center gap-2">
        <div className="w-full bg-white rounded-2xl shadow-float flex items-center">
          <button onClick={onOpenSheet} className="flex-1 min-w-0 flex items-center gap-3 text-left pl-4 py-2.5"
            aria-label={t('Voir le trajet {from} vers {to}', { from: fromText, to: toText })}>
            <div className="flex flex-col items-center flex-shrink-0" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-ink" />
              <span className="w-px h-3 bg-ink" />
              <span className="w-2 h-2 bg-ink" />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-ink truncate">{fromText}</div>
              <div className="text-sm font-semibold text-ink truncate">{toText}</div>
            </div>
          </button>
          <button onClick={onClear} aria-label={t('Effacer le trajet')}
            className="w-11 h-11 mr-1 rounded-full flex items-center justify-center text-ink-2 active:bg-ink-fill flex-shrink-0">
            <Icon name="x" size={20} />
          </button>
        </div>
        {taxiStatus && (
          <button onClick={onOpenSheet}
            className="bg-ink text-white text-sm font-medium rounded-full pl-3 pr-4 py-2 shadow-float flex items-center gap-2">
            <Icon name="taxi" size={16} />
            {taxiStatus}{taxiMode === 'driver_found' && taxiEta != null ? ` · ${taxiEta} min` : ''}
          </button>
        )}
      </div>
    );
  }

  // ── Accueil : pilule de recherche + raccourcis ─────────────────────
  const chips = quickPlaces(favorites, recents);
  return (
    <div className="mx-auto max-w-md">
      <button onClick={() => onOpen('to')}
        className="w-full bg-white rounded-full shadow-float flex items-center gap-3 pl-4 pr-2 h-12 text-left active:bg-gray-50">
        <Icon name="search" size={20} className="text-ink-2 flex-shrink-0" />
        <span className={`flex-1 min-w-0 truncate text-base ${fromNode ? 'text-ink' : 'text-ink-2'}`}>
          {fromNode ? `${fromNode.name} → ${toNode ? toNode.name : t('où vas-tu ?')}` : t('Où vas-tu ?')}
        </span>
        <span aria-hidden="true"
          className="w-8 h-8 rounded-full bg-nawiy-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
          N
        </span>
      </button>

      {chips.length > 0 && (
        <div className="mt-2 -mx-3 px-3 flex gap-2 overflow-x-auto no-scrollbar">
          {chips.map(({ place, kind }) => (
            <button key={place.id} onClick={() => onQuickDestination(place)}
              className="flex-shrink-0 bg-white rounded-full shadow-float h-9 pl-3 pr-4 flex items-center gap-1.5 text-sm text-ink active:bg-gray-50">
              <Icon name={kind === 'fav' ? 'star' : 'clock'} size={16}
                filled={kind === 'fav'} className={kind === 'fav' ? 'text-nawiy-600' : 'text-ink-2'} />
              <span className="max-w-[10rem] truncate">{place.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
