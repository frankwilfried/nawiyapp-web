import { useState } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';
import { CATEGORIES } from '../lib/pricing';
import PushPrompt from './PushPrompt';
import { getClientId } from '../hooks/useTaxiPassenger';

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const clock = (min) => new Date(Date.now() + (min || 0) * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function CodeBadge({ code, big = false }) {
  if (!code) return null;
  return (
    <div className={`flex items-center justify-between rounded-lg bg-ink-fill px-3 ${big ? 'py-3' : 'py-2'}`}>
      <span className="text-sm text-ink-2">Code à donner au chauffeur</span>
      <span className={`font-bold text-ink tracking-[0.3em] ${big ? 'text-3xl' : 'text-xl'}`} aria-label={`Code ${code.split('').join(' ')}`}>{code}</span>
    </div>
  );
}

function DriverCard({ driver, category }) {
  const vehicle = [
    [driver.vehicle_model, driver.vehicle_color].filter(Boolean).join(' '),
    driver.helmet_color && `casque ${driver.helmet_color}`,
  ].filter(Boolean).join(' · ');
  // Repère le plus visible d'abord : numéro de gilet (motos), sinon la plaque
  const idLabel = driver.visible_number ? `N° ${driver.visible_number}` : driver.plate;
  return (
    <div className="flex items-center gap-3 py-3 border-y border-ink-line">
      <span className="w-12 h-12 rounded-full bg-ink-fill text-ink font-semibold flex items-center justify-center flex-shrink-0" aria-hidden="true">
        {initials(driver.name)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold text-ink truncate">{driver.name}</div>
        {driver.rating && (
          <div className="text-sm text-ink flex items-center gap-1">
            <Icon name="star" size={16} filled /><span>{String(driver.rating).replace('.', ',')}</span><span className="sr-only">sur 5</span>
          </div>
        )}
        <div className="text-sm text-ink-2 truncate">{vehicle || CATEGORIES[category]?.label}</div>
      </div>
      {idLabel && (
        <div className="text-right flex-shrink-0">
          <div className="bg-ink-fill rounded-md px-2 py-1 text-base font-bold text-ink tracking-wide">{idLabel}</div>
        </div>
      )}
    </div>
  );
}

// « Retrouver ton chauffeur » : signal partagé, radar de proximité, description, signe de la main
function FindDriver({ signal, distance, direction, note, onSignal, onWave, onNote }) {
  const [draft, setDraft] = useState('');
  const [waved, setWaved] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {distance != null && (
        <div className="flex items-center gap-3 rounded-lg bg-ink-fill px-3 py-2" role="status">
          <Icon name="navigation" size={18} className="text-ink flex-shrink-0" />
          <p className="text-sm text-ink"><span className="font-semibold">À {distance}</span> · {direction}</p>
        </div>
      )}
      {signal && (
        <button onClick={onSignal}
          className="h-12 rounded-lg text-base font-semibold flex items-center justify-center gap-2"
          style={{ background: signal.hex, color: signal.text, boxShadow: signal.id === 'blanc' ? 'inset 0 0 0 1px #E2E2E2' : undefined }}>
          <Icon name="smartphone" size={18} /> Allumer mon signal · {signal.name} {signal.number}
        </button>
      )}
      <div className="flex gap-2">
        <button onClick={() => { onWave(); setWaved(true); setTimeout(() => setWaved(false), 4000); }}
          className="flex-1 h-11 bg-ink-fill text-ink text-sm font-semibold rounded-lg active:bg-ink-line">
          {waved ? 'Signe envoyé' : 'Je te fais signe'}
        </button>
      </div>
      {note ? (
        <p className="text-sm text-ink-2">Ton chauffeur sait : « {note} »</p>
      ) : (
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (draft.trim()) onNote(draft.trim()); }}>
          <label htmlFor="pax-note" className="sr-only">Un détail pour te reconnaître</label>
          <input id="pax-note" value={draft} onChange={e => setDraft(e.target.value)} maxLength={120}
            placeholder="T-shirt bleu, devant la pharmacie…"
            className="flex-1 min-w-0 h-11 bg-ink-fill rounded-lg px-3 text-sm text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-ink" />
          <button type="submit" disabled={!draft.trim()} className="h-11 px-4 bg-ink text-white text-sm font-semibold rounded-lg disabled:bg-ink-fill disabled:text-ink-3">
            Envoyer
          </button>
        </form>
      )}
    </div>
  );
}

function Actions({ driver, onShare, onSafety }) {
  const btn = 'flex-1 h-14 bg-ink-fill text-ink text-xs font-semibold rounded-lg flex flex-col items-center justify-center gap-1 active:bg-ink-line';
  return (
    <div className="flex gap-2">
      {driver.phone && <a href={`tel:${driver.phone.replace(/\s/g, '')}`} className={btn}><Icon name="phone" size={18} />Appeler</a>}
      {driver.phone && <a href={`sms:${driver.phone.replace(/\s/g, '')}`} className={btn}><Icon name="message" size={18} />Message</a>}
      <button onClick={onShare} className={btn}><Icon name="share" size={18} />Partager</button>
      <button onClick={onSafety} className={btn}><Icon name="shield" size={18} />Sécurité</button>
    </div>
  );
}

// Suivi de course façon Uber : fond blanc, typo noire, une action principale par état
export default function TaxiWidget({
  taxiMode, taxiRide, taxiDriver, taxiEta, taxiNotified, connected,
  onCancel, onShare, onSafety, find = {}, offer = {},
}) {
  const code = taxiRide?.pickup_code;

  return (
    <div aria-live="polite">
      {taxiMode === 'searching' && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-bold text-ink">Recherche d'un chauffeur</h3>
            <p className="text-sm text-ink-2 mt-1 flex items-center gap-1.5">
              {!connected
                ? <><Icon name="wifiOff" size={16} /> Connexion au service taxi…</>
                : taxiNotified > 0 ? `${taxiNotified} chauffeur${taxiNotified > 1 ? 's' : ''} ${taxiNotified > 1 ? 'ont' : 'a'} reçu ta demande`
                : 'On cherche un chauffeur disponible près de toi'}
            </p>
          </div>
          <div className="h-1 bg-ink-fill rounded-full overflow-hidden" role="progressbar" aria-label="Recherche en cours">
            <motion.div className="h-full w-1/3 bg-ink rounded-full"
              animate={{ x: ['-100%', '300%'] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} />
          </div>
          {taxiRide && (
            <p className="text-sm text-ink-2">
              {CATEGORIES[taxiRide.category]?.label} · Ton offre <span className="text-ink font-semibold">{taxiRide.price?.toLocaleString('fr-FR')} FCFA</span>
              {taxiRide.recommended_price && taxiRide.recommended_price !== taxiRide.price && (
                <> · conseillé {taxiRide.recommended_price.toLocaleString('fr-FR')} F</>
              )}
            </p>
          )}

          {/* Refus des chauffeurs (façon inDrive) : proposer d'augmenter l'offre */}
          {offer.declines?.declined > 0 && (
            <div className="rounded-lg bg-amber-100 text-amber-900 px-3 py-2" role="status">
              <p className="text-sm font-semibold">
                {offer.declines.all_declined
                  ? 'Les chauffeurs proches ont refusé ton offre'
                  : `${offer.declines.declined} chauffeur${offer.declines.declined > 1 ? 's ont' : ' a'} refusé ton offre`}
              </p>
              <p className="text-sm">Augmente-la pour trouver plus vite.</p>
            </div>
          )}
          {offer.nextOffer && (
            <button onClick={offer.onRaise} disabled={offer.raising}
              className={`w-full h-12 text-base font-semibold rounded-lg disabled:opacity-60 ${offer.declines?.declined > 0 ? 'bg-ink text-white active:bg-gray-800' : 'bg-ink-fill text-ink active:bg-ink-line'}`}>
              {offer.raising ? 'Envoi…' : `Augmenter à ${offer.nextOffer.toLocaleString('fr-FR')} F`}
            </button>
          )}

          <PushPrompt scope="passenger" anonClientId={getClientId()}
            title="Être prévenu à l'arrivée"
            body="Même si tu quittes l'appli pendant l'attente." />

          <button onClick={onCancel} className="w-full h-12 bg-ink-fill text-ink text-base font-semibold rounded-lg active:bg-ink-line">
            Annuler la demande
          </button>
        </div>
      )}

      {(taxiMode === 'driver_found' || taxiMode === 'driver_arrived') && taxiDriver && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-xl font-bold text-ink">
              {taxiMode === 'driver_arrived' ? 'Ton chauffeur est là'
                : taxiEta != null ? `Arrive dans ${taxiEta} min` : 'Ton chauffeur arrive'}
            </h3>
            {taxiMode === 'driver_found' && taxiEta != null && <span className="text-sm text-ink-2">{clock(taxiEta)}</span>}
          </div>
          {taxiMode === 'driver_arrived' && (
            <p className="text-sm text-ink-2 -mt-2">Cherche la plaque <span className="font-semibold text-ink">{taxiDriver.plate}</span></p>
          )}
          <DriverCard driver={taxiDriver} category={taxiRide?.category} />
          <FindDriver {...find} />
          <CodeBadge code={code} big={taxiMode === 'driver_arrived'} />
          <Actions driver={taxiDriver} onShare={onShare} onSafety={onSafety} />
          <button onClick={onCancel} className="h-11 text-base font-semibold text-red-700 rounded-lg active:bg-red-50">
            Annuler la course
          </button>
        </div>
      )}

      {taxiMode === 'in_progress' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-xl font-bold text-ink">En route</h3>
            {taxiEta != null && <span className="text-sm text-ink-2">Arrivée vers {clock(taxiEta)}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-ink-fill text-ink flex items-center justify-center flex-shrink-0"><Icon name="flag" size={18} /></span>
            <div className="min-w-0">
              <div className="text-sm text-ink-2">Destination</div>
              <div className="text-base text-ink truncate">{taxiRide?.to?.name}</div>
            </div>
          </div>
          {taxiDriver && <DriverCard driver={taxiDriver} category={taxiRide?.category} />}
          <div className="flex gap-2">
            <button onClick={onShare} className="flex-1 h-12 bg-ink-fill text-ink text-base font-semibold rounded-lg flex items-center justify-center gap-2 active:bg-ink-line">
              <Icon name="share" size={18} /> Partager
            </button>
            <button onClick={onSafety} className="flex-1 h-12 bg-ink-fill text-ink text-base font-semibold rounded-lg flex items-center justify-center gap-2 active:bg-ink-line">
              <Icon name="shield" size={18} /> Sécurité
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
