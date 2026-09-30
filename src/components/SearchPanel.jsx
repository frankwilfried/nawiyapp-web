import { useRef } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';
import { placeIcon, PLACE_TYPE_LABELS } from '../lib/placeTypes';

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
  const fromInputRef = useRef(null);
  const toInputRef   = useRef(null);
  if (!open) return null;

  const sugg        = activeInput === 'from' ? fromSugg : toSugg;
  const currentText = activeInput === 'from' ? fromText : toText;
  const currentNode = activeInput === 'from' ? fromNode : toNode;
  const typedButNotChosen = currentText && !currentNode;

  // Dès que départ et destination sont choisis, on lance la recherche (comme Uber)
  const selectNode = (n) => {
    onResolvePlaceCoords(n, (resolved) => {
      addRecent(resolved);
      if (activeInput === 'from') {
        setFromText(resolved.name); setFromNode(resolved); setFromSugg([]);
        if (toNode) { onSearch(resolved, toNode); return; }
        setActiveInput('to'); toInputRef.current?.focus();
      } else {
        setToText(resolved.name); setToNode(resolved); setToSugg([]);
        if (fromNode) { onSearch(fromNode, resolved); return; }
        setActiveInput('from'); fromInputRef.current?.focus();
      }
    });
  };

  const useMyPosition = () => {
    const node = onUseMyPosition();
    if (!node) return;
    if (toNode) onSearch(node, toNode);
    else toInputRef.current?.focus();
  };

  const placeRow = (place, { icon, withFavorite } = {}) => (
    <li key={place.id} className="flex items-center border-b border-ink-line last:border-0">
      <button onClick={() => selectNode(place)}
        className="flex-1 min-w-0 flex items-center gap-4 py-3 text-left active:bg-ink-fill -mx-2 px-2 rounded-lg">
        <span className="w-10 h-10 rounded-full bg-ink-fill text-ink flex items-center justify-center flex-shrink-0">
          <Icon name={icon || placeIcon(place.type)} size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-base text-ink truncate">{place.name}</span>
          <span className="block text-sm text-ink-2 truncate">
            {place.subtitle || PLACE_TYPE_LABELS[place.type] || ''}
          </span>
        </span>
      </button>
      {withFavorite && (
        <button onClick={() => toggleFavorite(place)}
          aria-label={isFavorite(place.id) ? `Retirer ${place.name} des favoris` : `Ajouter ${place.name} aux favoris`}
          aria-pressed={isFavorite(place.id)}
          className="w-11 h-11 flex items-center justify-center text-ink flex-shrink-0 active:bg-ink-fill rounded-full">
          <Icon name="star" size={20} filled={isFavorite(place.id)} />
        </button>
      )}
    </li>
  );

  const renderList = () => {
    if (typedButNotChosen && sugg.length === 0) {
      if (suggLoading) return (
        <div className="py-10 flex flex-col items-center gap-3" role="status">
          <div className="w-6 h-6 border-2 border-ink-fill border-t-ink rounded-full animate-spin" />
          <p className="text-ink-2 text-sm">Recherche en cours…</p>
        </div>
      );
      return (
        <div className="py-10 text-center">
          <p className="text-ink text-base">Aucun résultat pour « {currentText} »</p>
          <p className="text-ink-2 text-sm mt-1">Essaie un quartier ou un carrefour : Akwa, Ndokoti, Bonabéri…</p>
        </div>
      );
    }

    if (sugg.length > 0) {
      return (
        <ul aria-label="Suggestions">
          {sugg.map(n => placeRow(n))}
        </ul>
      );
    }

    return (
      <>
        {activeInput === 'from' && !fromNode && (
          <ul className="mb-2">
            <li className="border-b border-ink-line">
              <button onClick={useMyPosition}
                className="w-full flex items-center gap-4 py-3 text-left active:bg-ink-fill -mx-2 px-2 rounded-lg">
                <span className="w-10 h-10 rounded-full bg-nawiy-light text-nawiy-600 flex items-center justify-center flex-shrink-0">
                  <Icon name="navigation" size={18} />
                </span>
                <span>
                  <span className="block text-base text-ink">Ma position actuelle</span>
                  <span className="block text-sm text-ink-2">{userPosition ? 'GPS actif' : 'Active la localisation de ton téléphone'}</span>
                </span>
              </button>
            </li>
          </ul>
        )}

        {favorites.length > 0 && (
          <section className="mb-4">
            <h3 className="text-sm font-semibold text-ink mt-2 mb-1">Favoris</h3>
            <ul>{favorites.map(p => placeRow(p, { icon: 'star', withFavorite: true }))}</ul>
          </section>
        )}
        {recents.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-ink mt-2 mb-1">Récents</h3>
            <ul>{recents.map(p => placeRow(p, { icon: 'clock', withFavorite: true }))}</ul>
          </section>
        )}
        {!favorites.length && !recents.length && (
          <div className="py-10 text-center">
            <p className="text-ink text-base">{activeInput === 'from' ? 'D\'où tu pars ?' : 'Où vas-tu ?'}</p>
            <p className="text-ink-2 text-sm mt-1">Un quartier, un marché, un carrefour…</p>
          </div>
        )}
      </>
    );
  };

  const inputCls = 'w-full h-11 bg-ink-fill rounded-lg pl-3 pr-11 text-base text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-ink';

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed inset-0 z-50 bg-white flex flex-col"
      role="dialog" aria-modal="true" aria-labelledby="search-title"
    >
      <div className="px-4 pb-3 shadow-[0_1px_0_#E2E2E2]" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={onClose} aria-label="Retour à la carte"
            className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-ink active:bg-ink-fill">
            <Icon name="arrowLeft" size={24} />
          </button>
          <h2 id="search-title" className="text-lg font-semibold text-ink">Ton trajet</h2>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col items-center pt-[18px]" aria-hidden="true">
            <span className="w-2 h-2 rounded-full bg-ink" />
            <span className="w-px flex-1 bg-ink my-1" />
            <span className="w-2 h-2 bg-ink mb-[18px]" />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="relative">
              <input ref={fromInputRef} autoFocus={activeInput === 'from'} value={fromText}
                aria-label="Point de départ" placeholder="Point de départ"
                onFocus={() => setActiveInput('from')}
                onChange={e => { setFromText(e.target.value); setFromNode(null); onSuggest(e.target.value, setFromSugg); }}
                className={inputCls} />
              {fromText && (
                <button onClick={() => { setFromText(''); setFromNode(null); setFromSugg([]); setActiveInput('from'); fromInputRef.current?.focus(); }}
                  aria-label="Effacer le départ"
                  className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-ink-2">
                  <Icon name="x" size={18} />
                </button>
              )}
            </div>
            <div className="relative">
              <input ref={toInputRef} autoFocus={activeInput === 'to'} value={toText}
                aria-label="Destination" placeholder="Où vas-tu ?"
                onFocus={() => setActiveInput('to')}
                onChange={e => { setToText(e.target.value); setToNode(null); onSuggest(e.target.value, setToSugg); }}
                className={inputCls} />
              {toText && (
                <button onClick={() => { setToText(''); setToNode(null); setToSugg([]); setActiveInput('to'); toInputRef.current?.focus(); }}
                  aria-label="Effacer la destination"
                  className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-ink-2">
                  <Icon name="x" size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {typedButNotChosen && sugg.length > 0 && (
          <p className="text-sm text-ink-2 mt-2 pl-5">Choisis un lieu dans la liste</p>
        )}
        {searchError && <p className="text-sm text-red-700 mt-2 pl-5" role="alert">{searchError}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4">
        {renderList()}
      </div>

      {fromNode && toNode && !typedButNotChosen && (
        <div className="px-4 pt-2 border-t border-ink-line" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button onClick={() => onSearch(fromNode, toNode)}
            className="w-full h-12 bg-ink text-white text-base font-semibold rounded-lg active:bg-gray-800">
            Voir les trajets
          </button>
        </div>
      )}
    </motion.div>
  );
}
