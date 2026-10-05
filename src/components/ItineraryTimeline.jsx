import Icon from './Icon';
import { modeOf } from '../lib/modes';
import { t } from '../i18n';

// Repère OpenStreetMap le plus visible près d'un carrefour (où chercher le véhicule)
const landmarkHint = (place) => {
  const lm = place?.landmarks?.[0];
  return lm ? `${t('Repère :')} ${lm.name} (${t(lm.kind_label)}, ${lm.distance_m} m)` : null;
};

const hhmm = (ts) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fcfa = (n) => `${n.toLocaleString('fr-FR')} F`;

// Colonne de gauche (heure ou durée) · ligne verticale · contenu — comme DB Navigator
function Row({ left, line, children, shaded = false, leftMuted = false }) {
  return (
    <li className={`grid grid-cols-[3.25rem_1.25rem_1fr] gap-x-2 ${shaded ? 'bg-[#F3F3F3] -mx-4 px-4' : ''}`}>
      <div className={`text-right pt-3 ${leftMuted ? 'text-xs text-ink-2' : 'text-sm font-semibold text-ink'}`}>{left}</div>
      <div className="relative flex justify-center" aria-hidden="true">{line}</div>
      <div className="min-w-0 py-3">{children}</div>
    </li>
  );
}

const SolidLine  = ({ color }) => <span className="absolute inset-y-0 w-[3px]" style={{ background: color }} />;
const DottedLine = () => <span className="absolute inset-y-0 border-l-2 border-dotted border-ink-3" />;
const StopDot = ({ color, last }) => (
  <>
    {color && <span className="absolute top-0 bottom-0 w-[3px]" style={{ background: color }} />}
    <span className={`relative mt-[15px] w-3 h-3 border-[2.5px] border-ink bg-white ${last ? 'rounded-sm bg-ink' : 'rounded-full'}`} />
  </>
);

function StopRow({ time, name, lineColor, last = false, hint }) {
  return (
    <Row left={<><span className="sr-only">Vers </span>{hhmm(time)}</>}
      line={<StopDot color={lineColor} last={last} />}>
      <div className="text-base font-semibold text-ink leading-snug">{name}</div>
      {hint && <div className="text-sm text-ink-2">{hint}</div>}
    </Row>
  );
}

export default function ItineraryTimeline({ trip }) {
  const { legs } = trip;
  const rows = [];

  legs.forEach((leg, i) => {
    const prev = legs[i - 1];
    const stopName = leg.kind === 'change' ? leg.at.name : leg.from.name;
    // Un arrêt en haut de chaque étape (sauf juste après un changement, où il est déjà affiché)
    if (leg.kind !== 'change' && prev?.kind !== 'change') {
      rows.push(<StopRow key={`s${i}`} time={leg.startAt} name={stopName}
        hint={leg.kind === 'ride' ? landmarkHint(leg.from) : null}
        lineColor={leg.kind === 'ride' ? modeOf(leg.transport).color : null} />);
    }

    if (leg.kind === 'walk') {
      rows.push(
        <Row key={`w${i}`} shaded leftMuted left={`${leg.minutes} min`} line={<DottedLine />}>
          <p className="text-sm text-ink flex items-center gap-1.5">
            <Icon name="walk" size={16} /> {t('À pied')} · ~{leg.distanceM} m
          </p>
        </Row>
      );
    }

    if (leg.kind === 'change') {
      rows.push(<StopRow key={`sa${i}`} time={leg.startAt} name={leg.at.name} lineColor={modeOf(prev.transport).color} />);
      rows.push(
        <Row key={`c${i}`} shaded leftMuted left={`${leg.minutes} min`} line={<DottedLine />}>
          <p className="text-sm text-ink flex items-center gap-1.5">
            <Icon name="route" size={16} /> {t('Changement · trouve le véhicule suivant au carrefour')}
          </p>
        </Row>
      );
      rows.push(<StopRow key={`sd${i}`} time={leg.endAt} name={leg.at.name} hint={landmarkHint(leg.at)}
        lineColor={modeOf(legs[i + 1]?.transport).color} />);
    }

    if (leg.kind === 'ride') {
      const m = modeOf(leg.transport);
      rows.push(
        <Row key={`r${i}`} leftMuted line={<SolidLine color={m.color} />}
          left={<>{leg.minutes} min{leg.waitMin > 0 && <><br /><span className="text-ink-2">+ ~{leg.waitMin} {t('attente')}</span></>}</>}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-sm font-semibold text-white" style={{ background: m.color }}>
              <Icon name={m.icon} size={16} /> {t(m.label)}
            </span>
            <span className="text-sm font-semibold text-ink">{leg.estimated ? '~' : ''}{fcfa(leg.price)}</span>
          </div>
          <p className="text-sm text-ink-2 mt-1.5">
            {leg.transport === 'taxi_collectif' ? `${t('Dis au chauffeur :')} ` : ''}
            <span className="text-ink font-medium">{leg.announce}</span>
          </p>
          {leg.estimated && <p className="text-xs text-ink-2 mt-1">{t('Prix et durée estimés (hors réseau connu)')}</p>}
        </Row>
      );
    }
  });

  const last = legs.at(-1);
  rows.push(<StopRow key="end" time={trip.arriveAt} name={last.kind === 'change' ? last.at.name : last.to.name} last />);

  return (
    <div>
      <p className="text-xs text-ink-2 mb-1">
        Heures estimées à partir de {hhmm(trip.departAt)} · pas d'horaires fixes en transport informel
      </p>
      <ol aria-label="Étapes du trajet">{rows}</ol>
      {legs.some(l => l.from?.landmarks?.length || l.at?.landmarks?.length) && (
        <p className="text-xs text-ink-2 mt-2">Repères © contributeurs OpenStreetMap</p>
      )}
    </div>
  );
}

// Résumé compact des modes : 🚶 › taxi › moto
export function ModeChain({ legs }) {
  const parts = legs.filter(l => l.kind !== 'change');
  return (
    <span className="inline-flex items-center gap-1 text-ink" aria-label={parts.map(l => l.kind === 'walk' ? 'à pied' : modeOf(l.transport).label).join(', puis ')}>
      {parts.map((l, i) => (
        <span key={i} className="inline-flex items-center gap-1" aria-hidden="true">
          {i > 0 && <span className="text-ink-3 text-xs">›</span>}
          {l.kind === 'walk'
            ? <Icon name="walk" size={14} className="text-ink-2" />
            : <span className="inline-flex rounded p-0.5 text-white" style={{ background: modeOf(l.transport).color }}><Icon name={modeOf(l.transport).icon} size={12} /></span>}
        </span>
      ))}
    </span>
  );
}
