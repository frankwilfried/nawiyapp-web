const TAXI_PRICE = 3000;

export default function TaxiWidget({ taxiMode, taxiDriver, taxiEta, taxiFinalPrice, taxiRating, fromText, toText, onRequest, onCancel, onRate }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-3">
      <div className="text-xs text-white/60 font-semibold mb-2">🚕 Taxi course</div>

      {taxiMode === 'idle' && (
        <>
          <div className="flex items-baseline gap-1 mb-0.5">
            <span className="text-xl font-bold text-white">{TAXI_PRICE.toLocaleString()}</span>
            <span className="text-xs text-white/50">FCFA</span>
          </div>
          <div className="text-xs text-white/40 mb-2.5">Trajet direct · Prix fixe</div>
          <button onClick={onRequest}
            className="w-full bg-nawiy-green text-white text-xs font-bold py-2 rounded-xl hover:bg-green-500 transition active:scale-95">
            Demander →
          </button>
        </>
      )}

      {taxiMode === 'searching' && (
        <div className="flex flex-col items-center py-1 gap-2">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-nawiy-green/20 animate-ping" />
            <div className="absolute inset-1 rounded-full bg-nawiy-green/30 animate-ping" style={{ animationDelay: '0.3s' }} />
            <span className="relative text-lg z-10">🚕</span>
          </div>
          <div className="text-white text-xs font-semibold text-center">Recherche un chauffeur...</div>
          <button onClick={onCancel} className="text-white/40 text-xs hover:text-white/70 transition">Annuler</button>
        </div>
      )}

      {taxiMode === 'driver_found' && taxiDriver && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-nawiy-green/20 flex items-center justify-center text-base flex-shrink-0">🧑🏾</div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-bold truncate">{taxiDriver.name}</div>
              <div className="text-white/50 text-xs">{taxiDriver.plate} · ⭐ {taxiDriver.rating}</div>
            </div>
          </div>
          <div className="bg-nawiy-green/10 rounded-lg px-2 py-1 flex items-center justify-between">
            <span className="text-white/60 text-xs">Arrive dans</span>
            <span className="text-nawiy-green font-bold text-sm">{taxiEta} min</span>
          </div>
          <div className="text-xs text-white/40 text-center">{taxiDriver.vehicle_model}</div>
          <div className="flex gap-1.5 mt-0.5">
            <a href={`tel:${taxiDriver.phone}`}
              className="flex-1 bg-white/10 text-white text-xs py-1.5 rounded-lg text-center hover:bg-white/20 transition">
              📞 Appeler
            </a>
            <button onClick={onCancel}
              className="flex-1 bg-red-500/20 text-red-300 text-xs py-1.5 rounded-lg hover:bg-red-500/30 transition">
              ✕ Annuler
            </button>
          </div>
        </div>
      )}

      {taxiMode === 'driver_arrived' && taxiDriver && (
        <div className="flex flex-col items-center gap-2 py-1">
          <div className="w-10 h-10 rounded-full bg-nawiy-green/20 flex items-center justify-center text-xl">🚕</div>
          <div className="text-nawiy-green text-xs font-bold text-center">Chauffeur arrivé !</div>
          <div className="text-white/60 text-xs text-center">{taxiDriver.name} vous attend</div>
          <div className="text-white/40 text-xs text-center italic">{taxiDriver.plate}</div>
        </div>
      )}

      {taxiMode === 'in_progress' && (
        <div className="flex flex-col items-center gap-2 py-1">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full bg-nawiy-green/30 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center text-xl">🚗</div>
          </div>
          <div className="text-white text-xs font-bold text-center">Course en cours</div>
          <div className="text-white/50 text-xs text-center">{fromText} → {toText}</div>
        </div>
      )}

      {taxiMode === 'completed' && (
        <div className="flex flex-col gap-2">
          <div className="text-nawiy-green text-xs font-bold text-center">✅ Course terminée !</div>
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <div className="text-white text-sm font-bold">{(taxiFinalPrice || TAXI_PRICE).toLocaleString()} FCFA</div>
            <div className="text-white/40 text-xs">Prix final</div>
          </div>
          {taxiRating === 0 ? (
            <>
              <div className="text-white/60 text-xs text-center">Note ta course</div>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => onRate(star)}
                    className="text-xl hover:scale-125 transition-transform">⭐</button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="text-nawiy-green text-xs font-semibold">Merci ! {'⭐'.repeat(taxiRating)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
