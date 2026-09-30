export default function SearchBar({ result, fromText, toText, fromNode, toNode, onOpen, onClear }) {
  if (result) {
    return (
      <div className="bg-nawiy-green text-white rounded-2xl shadow-xl mx-auto max-w-md px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="font-semibold text-sm">{fromText} → {toText}</div>
          <div className="text-xs text-white/80 mt-0.5">
            {result.total_duration_min} min • {result.total_price_fcfa ?? 'Prix : données en cours'}
            {result.walkingIntro && (
              <span className="opacity-70"> • 🚶 {result.walkingIntro.minutes} min à pied</span>
            )}
          </div>
        </div>
        <button onClick={onClear}
          className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
          <span className="text-sm">✕</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-xl mx-auto max-w-md cursor-pointer overflow-hidden"
      onClick={() => onOpen('from')}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-8 h-8 rounded-full bg-nawiy-light flex items-center justify-center flex-shrink-0">
          <span className="text-nawiy-green font-bold text-sm">N</span>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-800">
            {fromNode ? fromNode.name : "D'où tu pars ?"}
          </div>
          {fromNode
            ? <div className="text-xs text-gray-400 mt-0.5">→ {toNode ? toNode.name : 'Où vas-tu ?'}</div>
            : <div className="text-xs text-gray-400 mt-0.5">Trouver un itinéraire</div>
          }
        </div>
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}
