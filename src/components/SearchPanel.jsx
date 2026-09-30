import { motion } from 'framer-motion';
import { searchFormSchema } from '../lib/schemas';

const TYPE_COLORS = {
  carrefour:  '#E85D3A',
  quartier:   '#1D9E75',
  marche:     '#D4A017',
  universite: '#3B82F6',
  transport:  '#8B5CF6',
  autre:      '#6B7280',
};

export default function SearchPanel({
  open, onClose,
  activeInput, setActiveInput,
  fromText, setFromText, fromNode, setFromNode,
  toText, setToText, toNode, setToNode,
  fromSugg, setFromSugg, toSugg, setToSugg,
  suggLoading, searchError,
  userPosition, recents, favorites, isFavorite, toggleFavorite,
  onSuggest, onResolvePlaceCoords, onUseMyPosition, onSearch, addRecent,
}) {
  if (!open) return null;

  const sugg = activeInput === 'from' ? fromSugg : toSugg;
  const currentText = activeInput === 'from' ? fromText : toText;

  const selectNode = (n) => {
    onResolvePlaceCoords(n, (resolved) => {
      addRecent(resolved);
      if (activeInput === 'from') {
        setFromText(resolved.name); setFromNode(resolved); setFromSugg([]); setActiveInput('to');
      } else {
        setToText(resolved.name); setToNode(resolved); setToSugg([]);
      }
    });
  };

  const renderPlaceRow = (place, icon) => (
    <div key={place.id} className="flex items-center gap-2 w-full">
      <button
        onClick={() => selectNode(place)}
        className="flex-1 flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-left"
      >
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-base flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">{place.name}</div>
          <div className="text-xs text-gray-400 truncate">{place.subtitle || place.type || ''}</div>
        </div>
      </button>
      <button onClick={() => toggleFavorite(place)}
        className="w-8 h-8 flex items-center justify-center text-base hover:scale-110 transition-transform flex-shrink-0"
        title={isFavorite(place.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        {isFavorite(place.id) ? '⭐' : '☆'}
      </button>
    </div>
  );

  const renderSuggestions = () => {
    if (currentText && currentText !== '📍 Ma position' && sugg.length === 0) {
      if (suggLoading) return (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-nawiy-green/30 border-t-nawiy-green rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Recherche en cours…</p>
        </div>
      );
      return (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">Aucun résultat pour "{currentText}"</p>
          <p className="text-gray-300 text-xs mt-1">Essaie : Akwa, Bonaberi, Deido...</p>
        </div>
      );
    }

    if (sugg.length > 0) {
      return (
        <>
          <p className="text-xs text-gray-400 font-semibold uppercase mb-2 px-1">{sugg.length} résultat{sugg.length > 1 ? 's' : ''}</p>
          {sugg.map(n => (
            <button key={n.id} onClick={() => selectNode(n)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: (TYPE_COLORS[n.type] || '#6B7280') + '20' }}>
                <div className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[n.type] || '#6B7280' }} />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-800">{n.name}</div>
                <div className="text-xs text-gray-400">{n.subtitle || n.type}</div>
              </div>
            </button>
          ))}
        </>
      );
    }

    const hasFav = favorites.length > 0;
    const hasRec = recents.length > 0;

    if (!hasFav && !hasRec) return (
      <div className="text-center py-10">
        <div className="text-3xl mb-3">🔍</div>
        <p className="text-gray-400 text-sm">{activeInput === 'from' ? 'Tape ton point de départ' : 'Tape ta destination'}</p>
        <p className="text-gray-300 text-xs mt-1">Ex : Akwa, Bonaberi, Marché Central...</p>
      </div>
    );

    return (
      <div className="flex flex-col gap-1">
        {hasFav && (
          <>
            <p className="text-xs text-gray-400 font-semibold uppercase mb-1 px-1">⭐ Favoris</p>
            {favorites.map(p => renderPlaceRow(p, '⭐'))}
          </>
        )}
        {hasRec && (
          <>
            <p className="text-xs text-gray-400 font-semibold uppercase mt-3 mb-1 px-1">🕐 Récents</p>
            {recents.map(p => renderPlaceRow(p, '🕐'))}
          </>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-40 bg-white flex flex-col"
    >
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-gray-600">←</span>
        </button>
        <h2 className="font-semibold text-gray-800">Trouver un itinéraire</h2>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-nawiy-green" />
            <input
              autoFocus={activeInput === 'from'}
              value={fromText}
              placeholder="Point de départ..."
              onFocus={() => setActiveInput('from')}
              onChange={e => { setFromText(e.target.value); setFromNode(null); onSuggest(e.target.value, setFromSugg); }}
              className="w-full bg-gray-50 rounded-xl pl-9 pr-10 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/30"
            />
            {fromText
              ? <button onClick={() => { setFromText(''); setFromNode(null); setFromSugg([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">✕</button>
              : <button onClick={onUseMyPosition} title="Utiliser ma position GPS"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-nawiy-green/10 hover:bg-nawiy-green/20 flex items-center justify-center transition text-base">
                  📍
                </button>
            }
          </div>
          {!fromNode && (
            <button onClick={onUseMyPosition}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-nawiy-light hover:bg-green-100 transition text-left w-full">
              <span className="text-base leading-none">📍</span>
              <div>
                <span className="text-sm font-semibold text-nawiy-green">Ma position</span>
                <span className="text-xs text-gray-400 ml-1">{userPosition ? '· GPS actif' : '· GPS requis'}</span>
              </div>
            </button>
          )}
        </div>

        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-400" />
          <input
            value={toText}
            placeholder="Destination..."
            onFocus={() => setActiveInput('to')}
            onChange={e => { setToText(e.target.value); setToNode(null); onSuggest(e.target.value, setToSugg); }}
            className="w-full bg-gray-50 rounded-xl pl-9 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-nawiy-green/30"
          />
          {toText && <button onClick={() => { setToText(''); setToNode(null); setToSugg([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">✕</button>}
        </div>

        {searchError && <p className="text-red-500 text-sm px-1">{searchError}</p>}

        <button onClick={() => {
          const result = searchFormSchema.safeParse({ fromNode, toNode });
          if (!result.success) { return; } // bouton disabled si invalide
          onSearch();
        }} disabled={!fromNode || !toNode || !searchFormSchema.safeParse({ fromNode, toNode }).success}
          className="bg-nawiy-green text-white rounded-xl py-3.5 font-semibold disabled:opacity-40 hover:bg-nawiy-dark transition">
          Rechercher l'itinéraire
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {renderSuggestions()}
      </div>
    </motion.div>
  );
}
