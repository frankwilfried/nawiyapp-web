import { useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import TaxiWidget from './TaxiWidget';
import Icon from './Icon';
import ItineraryTimeline, { ModeChain } from './ItineraryTimeline';
import { PaymentIcon } from './PaymentSheet';
import { CATEGORIES } from '../lib/pricing';

const CATEGORY_ICONS = { eco: 'car', confort: 'car', moto: 'bike' };
const CATEGORY_NOTES = { eco: 'Économique, 4 places', confort: 'Climatisé, plus spacieux', moto: 'Rapide, 1 passager' };
const CATEGORY_ORDER = ['moto', 'eco', 'confort'];
const fcfa = (n) => `${Number(n).toLocaleString('fr-FR')} F`;

function informelSummary(result) {
  const legs = result.legs || [];
  if (!legs.length) return { title: 'Transport informel', icon: 'users', subtitle: `~${result.total_duration_min} min · estimation`, price: '—' };
  // Trajet court entièrement à pied : on le dit clairement
  if (legs.every(l => l.kind === 'walk')) {
    const m = legs.reduce((s, l) => s + (l.distanceM || 0), 0);
    return { title: 'À pied', icon: 'walk', subtitle: `~${result.total_duration_min} min · ${m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`}`, price: 'Gratuit' };
  }
  const changes = result.changes === 0 ? 'direct' : `${result.changes} changement${result.changes > 1 ? 's' : ''}`;
  const estimated = legs.some(l => l.estimated);
  return {
    title: 'Transport informel', icon: 'users',
    subtitle: <>~{result.total_duration_min} min · {changes}<span className="flex mt-1"><ModeChain legs={legs} /></span></>,
    price: result.total_price_fcfa ? `${estimated ? '~' : ''}${fcfa(result.total_price_fcfa)}` : 'À pied',
  };
}

// Ligne de menu : ouvre un sous-écran (itinéraire ou course)
function MenuRow({ onClick, icon, title, subtitle, price, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:bg-ink-fill disabled:opacity-60">
      <span className="w-11 h-11 rounded-full bg-ink-fill text-ink flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={22} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-base font-semibold text-ink">{title}</span>
        <span className="block text-sm text-ink-2">{subtitle}</span>
      </span>
      <span className="text-base font-semibold text-ink flex-shrink-0">{price}</span>
      <Icon name="chevronRight" size={18} className="text-ink-3 flex-shrink-0" />
    </button>
  );
}

// Ligne à cocher : une catégorie de course
function OptionRow({ selected, onSelect, icon, title, subtitle, price }) {
  return (
    <button role="radio" aria-checked={selected} onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-shadow
        ${selected ? 'ring-2 ring-ink' : 'active:bg-ink-fill'}`}>
      <span className="w-10 h-10 rounded-full bg-ink-fill text-ink flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={22} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-base font-semibold text-ink">{title}</span>
        <span className="block text-sm text-ink-2 truncate">{subtitle}</span>
      </span>
      <span className="text-base font-semibold text-ink flex-shrink-0">{price}</span>
    </button>
  );
}

function SubHeader({ title, onBack }) {
  return (
    <div className="flex items-center gap-1 -ml-2 mb-1">
      <button onClick={onBack} aria-label="Retour aux choix" className="w-11 h-11 rounded-full flex items-center justify-center text-ink active:bg-ink-fill">
        <Icon name="arrowLeft" size={22} />
      </button>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
    </div>
  );
}

export default function RouteSheet({
  open, result, toText, initialView = 'overview',
  taxiMode, taxiRide, taxiDriver, taxiEta, taxiNotified, taxiConnected,
  taxiEstimate, payment, onOpenPayment, onOrderTaxi,
  onClose, onNavigate, onShare, onShareTaxi, onSafety, onCancelTaxi, taxiFind,
}) {
  // overview : deux choix · itinerary : frise façon DB Navigator · ride : course à la demande
  const [view, setView] = useState(initialView);
  const [category, setCategory] = useState('moto');
  const dragControls = useDragControls();
  if (!open || !result) return null;

  const rideActive = !['idle', 'pickup', 'completed'].includes(taxiMode);
  const informel = informelSummary(result);
  const categories = CATEGORY_ORDER.map(id => taxiEstimate?.categories?.find(c => c.id === id)).filter(Boolean);
  const cheapest = categories.length ? Math.min(...categories.map(c => c.price)) : null;
  const nearest = categories.filter(c => c.pickup_eta_min != null).sort((a, b) => a.pickup_eta_min - b.pickup_eta_min)[0];
  const selectedCat = categories.find(c => c.id === category);
  const payMethod = taxiEstimate?.payment_methods?.find(m => m.id === payment.method);
  const hasItinerary = result.legs?.length > 0;

  const primaryBtn = 'flex-1 h-12 bg-ink text-white text-base font-semibold rounded-lg flex items-center justify-center gap-2 active:bg-gray-800 disabled:bg-ink-fill disabled:text-ink-3';
  const shareBtn = (
    <button onClick={onShare} aria-label="Partager le trajet sur WhatsApp"
      className="w-12 h-12 bg-ink-fill text-ink rounded-lg flex items-center justify-center flex-shrink-0 active:bg-ink-line">
      <Icon name="share" size={20} />
    </button>
  );

  return (
    <motion.section
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 34, stiffness: 320 }}
      drag="y" dragControls={dragControls} dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); }}
      className="fixed bottom-0 left-0 right-0 z-[45] bg-white rounded-t-2xl shadow-sheet max-h-[85vh] flex flex-col mx-auto max-w-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Trajet"
    >
      {/* Poignée : glisser vers le bas pour réduire, ou toucher la croix */}
      <div className="relative flex items-center justify-between px-2 pt-2 flex-shrink-0 touch-none cursor-grab"
        onPointerDown={(e) => dragControls.start(e)}>
        <span className="absolute left-1/2 -translate-x-1/2 top-1.5 w-10 h-1 rounded-full bg-ink-line" aria-hidden="true" />
        <span className="w-11" />
        {!rideActive && view === 'overview' && <h2 className="text-lg font-bold text-ink">Comment tu y vas ?</h2>}
        <button onClick={onClose} aria-label="Réduire la fiche"
          className="w-11 h-11 rounded-full flex items-center justify-center text-ink-2 active:bg-ink-fill">
          <Icon name="x" size={20} />
        </button>
      </div>

      {rideActive ? (
        <div className="px-4 pb-2 overflow-y-auto min-h-0">
          <TaxiWidget
            taxiMode={taxiMode} taxiRide={taxiRide} taxiDriver={taxiDriver} taxiEta={taxiEta}
            taxiNotified={taxiNotified} connected={taxiConnected}
            onCancel={onCancelTaxi} onShare={onShareTaxi} onSafety={onSafety} find={taxiFind}
          />
        </div>
      ) : view === 'overview' ? (
        <div className="px-4 pb-3">
          <p className="text-sm text-ink-2 text-center -mt-1 mb-2 truncate">
            {toText}{result.distance_km ? ` · ${String(result.distance_km).replace('.', ',')} km` : ''}
          </p>
          <div className="flex flex-col divide-y divide-ink-line">
            <MenuRow onClick={() => hasItinerary ? setView('itinerary') : onNavigate()}
              icon={informel.icon} title={informel.title} subtitle={informel.subtitle} price={informel.price} />
            <MenuRow onClick={() => setView('ride')} icon="car" title="Course à la demande"
              subtitle={nearest ? `Un chauffeur à ${nearest.pickup_eta_min} min · moto, éco ou confort` : 'Moto, éco ou confort · on vient te chercher'}
              price={cheapest != null ? `dès ${fcfa(cheapest)}` : '…'} />
          </div>
        </div>
      ) : view === 'itinerary' ? (
        <>
          <div className="px-4 flex-shrink-0">
            <SubHeader title={informel.title === 'À pied' ? 'Itinéraire à pied' : 'Itinéraire'} onBack={() => setView('overview')} />
            <p className="text-sm text-ink-2 mb-2">
              {typeof informel.subtitle === 'string' ? informel.subtitle : `~${result.total_duration_min} min`} · {informel.price}
            </p>
          </div>
          <div id="route-detail" className="overflow-y-auto flex-1 min-h-0 px-4 pb-3 border-t border-ink-line pt-3">
            <ItineraryTimeline trip={result} />
          </div>
          <div className="px-4 pt-2 pb-3 flex gap-2 border-t border-ink-line flex-shrink-0">
            <button onClick={onNavigate} className={primaryBtn}><Icon name="navigation" size={18} /> Démarrer</button>
            {shareBtn}
          </div>
        </>
      ) : (
        <div className="px-4 pb-3 flex flex-col min-h-0">
          <SubHeader title="Course à la demande" onBack={() => setView('overview')} />
          <div role="radiogroup" aria-label="Catégorie de course" className="flex flex-col gap-0.5 overflow-y-auto">
            {categories.map(cat => (
              <OptionRow key={cat.id} selected={category === cat.id} onSelect={() => setCategory(cat.id)}
                icon={CATEGORY_ICONS[cat.id]} title={CATEGORIES[cat.id]?.label || cat.label}
                subtitle={cat.pickup_eta_min != null ? `${cat.pickup_eta_min} min · ${CATEGORY_NOTES[cat.id]}` : CATEGORY_NOTES[cat.id]}
                price={fcfa(cat.price)} />
            ))}
            {!categories.length && (
              <div role="status" aria-label="Calcul des prix">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5" aria-hidden="true">
                    <span className="w-10 h-10 rounded-full bg-ink-fill animate-pulse" />
                    <span className="flex-1"><span className="block h-4 w-28 bg-ink-fill rounded animate-pulse" /><span className="block h-3 w-40 bg-ink-fill rounded mt-2 animate-pulse" /></span>
                    <span className="h-4 w-14 bg-ink-fill rounded animate-pulse" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {categories.length > 0 && categories.every(c => c.drivers_nearby === 0) && (
            <p className="text-sm text-ink-2 mt-1 px-3 flex items-center gap-1.5">
              <Icon name="clock" size={16} /> Aucun chauffeur en ligne près de toi : l'attente peut être plus longue
            </p>
          )}

          <button onClick={onOpenPayment}
            className="w-full flex items-center gap-3 mt-2 px-3 h-11 border-t border-ink-line text-left active:bg-ink-fill">
            <PaymentIcon method={payment.method} />
            <span className="flex-1 text-base text-ink truncate">
              {payMethod?.label || 'Espèces'}{payment.phone ? ` · ${payment.phone.replace(/(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}` : ''}
            </span>
            <span className="text-sm text-ink-2">Changer</span>
            <Icon name="chevronRight" size={18} className="text-ink-2" />
          </button>
          {!taxiConnected && (
            <p className="text-sm text-ink-2 mt-1 px-1 flex items-center gap-1.5">
              <Icon name="wifiOff" size={16} /> Service de course injoignable pour l'instant
            </p>
          )}

          <div className="flex gap-2 mt-2">
            <button onClick={() => onOrderTaxi(category)} disabled={!taxiConnected || !selectedCat} className={primaryBtn}>
              Commander {CATEGORIES[category]?.label.replace('Nawiy ', '')}{selectedCat ? ` · ${fcfa(selectedCat.price)}` : ''}
            </button>
          </div>
        </div>
      )}
    </motion.section>
  );
}
