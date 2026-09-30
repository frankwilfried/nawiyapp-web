import { motion } from 'framer-motion';
import TaxiWidget from './TaxiWidget';

const TRANSPORT_ICONS  = { taxi_collectif: '🚕', moto_taxi: '🛵', minibus: '🚌', a_pied: '🚶' };
const TRANSPORT_LABELS = { taxi_collectif: 'Taxi collectif', moto_taxi: 'Moto-taxi', minibus: 'Minibus', a_pied: 'À pied' };
const TYPE_COLORS      = { carrefour: '#E85D3A', quartier: '#1D9E75', marche: '#D4A017', universite: '#3B82F6', transport: '#8B5CF6', autre: '#6B7280' };

export default function RouteSheet({
  open, result, fromText, toText,
  taxiMode, taxiDriver, taxiEta, taxiFinalPrice, taxiRating,
  onClose, onNavigate, onShare, onRequestTaxi, onCancelTaxi, onRate,
}) {
  if (!open || !result) return null;

  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 35, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col"
    >
      <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
        <div className="w-10 h-1 rounded-full bg-gray-200" />
      </div>

      <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="font-bold text-gray-900 text-base">{fromText} → {toText}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{result.distance_km ? `${result.distance_km} km` : ''}</p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
      </div>

      <div className="px-5 pb-4 flex-shrink-0">
        <div className="grid grid-cols-2 gap-3">
          {/* Option transport informel */}
          <div className="bg-nawiy-light rounded-2xl p-3">
            <div className="text-xs text-nawiy-dark font-semibold mb-2">🚌 Transport informel</div>
            <div className="flex items-baseline gap-1 mb-0.5">
              <span className="text-xl font-bold text-nawiy-green">~{result.total_duration_min}</span>
              <span className="text-xs text-gray-500">min</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {result.total_price_fcfa ? `${result.total_price_fcfa} FCFA` : 'Prix : données en cours'}
            </div>
            <div className="flex gap-1.5 mt-2">
              <button onClick={onNavigate}
                className="flex-1 bg-nawiy-green text-white text-xs font-bold py-1.5 rounded-xl hover:bg-nawiy-dark transition active:scale-95">
                🧭 Naviguer
              </button>
              <button onClick={onShare}
                className="flex-1 bg-white text-green-600 text-xs font-medium py-1.5 rounded-xl border border-green-200 hover:bg-green-50 transition">
                📤 Partager
              </button>
            </div>
          </div>

          {/* Option taxi */}
          <TaxiWidget
            taxiMode={taxiMode}
            taxiDriver={taxiDriver}
            taxiEta={taxiEta}
            taxiFinalPrice={taxiFinalPrice}
            taxiRating={taxiRating}
            fromText={fromText}
            toText={toText}
            onRequest={onRequestTaxi}
            onCancel={onCancelTaxi}
            onRate={onRate}
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-5 pb-4">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-3">Détail de l'itinéraire</p>
        <div className="flex flex-col">
          {result.walkingIntro && (
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center flex-shrink-0 w-8">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base">🚶</div>
                <div className="w-0.5 h-5 bg-gray-200 my-1" />
              </div>
              <div className="flex-1 pb-3">
                <div className="text-sm font-medium text-gray-800">📍 Ma position</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  À pied · {result.walkingIntro.minutes} min · {(result.walkingIntro.distanceKm * 1000).toFixed(0)} m
                  <span className="ml-1 text-gray-300">→ {result.walkingIntro.toName}</span>
                </div>
              </div>
            </div>
          )}

          {result.path.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center flex-shrink-0 w-8">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                  style={{ background: (TYPE_COLORS[step.from.type] || '#6B7280') + '20' }}>
                  {TRANSPORT_ICONS[step.transport]}
                </div>
                {i < result.path.length - 1 && <div className="w-0.5 h-5 bg-gray-200 my-1" />}
              </div>
              <div className="flex-1 pb-3">
                <div className="text-sm font-medium text-gray-800">{step.from.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {TRANSPORT_LABELS[step.transport]} · {step.duration_min} min · {step.price_fcfa} FCFA
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div className="text-sm font-semibold text-gray-800">{toText}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
