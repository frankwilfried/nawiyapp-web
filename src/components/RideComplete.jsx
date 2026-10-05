import { useState } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';
import { PaymentIcon } from './PaymentSheet';
import { t } from '../i18n';

const GOOD_TAGS = ['Ponctuel', 'Conduite sûre', 'Véhicule propre', 'Sympathique', 'Bon itinéraire'];
const BAD_TAGS  = ['En retard', 'Conduite dangereuse', 'Véhicule sale', 'Impoli', 'Mauvais itinéraire'];
const TIPS = [0, 200, 500, 1000];
const PAY_LABELS = { cash: 'en espèces', momo: 'par MTN MoMo', orange_money: 'par Orange Money' };

function PaymentStatus({ method, state }) {
  if (method === 'cash') return <p className="text-base text-ink-2">{t('À payer au chauffeur en espèces')}</p>;
  if (!state || state.status === 'pending') return <p className="text-base text-ink-2" role="status">{t('Confirme le paiement sur ton téléphone…')}</p>;
  if (state.status === 'paid') return <p className="text-base text-nawiy-600 font-semibold" role="status">{t('Payé')} {t(PAY_LABELS[method])}</p>;
  return <p className="text-base text-red-700" role="alert">{t("Le paiement mobile n'a pas abouti : paie le chauffeur en espèces.")}</p>;
}

// Fin de course façon Uber : montant, paiement, note avec étiquettes, pourboire
export default function RideComplete({ price, feeIncluded = 0, paymentMethod, paymentState, driver, onSubmit, onSkip }) {
  const [score, setScore] = useState(0);
  const [tags, setTags]   = useState([]);
  const [tip, setTip]     = useState(0);
  const tagList = score >= 4 ? GOOD_TAGS : BAD_TAGS;
  const toggle = (t) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] bg-white flex flex-col" role="dialog" aria-modal="true" aria-labelledby="done-title">
      <div className="flex-1 overflow-y-auto px-5 text-center" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
        <span className="w-14 h-14 rounded-full bg-nawiy-light text-nawiy-600 flex items-center justify-center mx-auto"><Icon name="check" size={30} /></span>
        <h2 id="done-title" className="text-xl font-bold text-ink mt-3">{t('Course terminée')}</h2>
        <div className="text-4xl font-bold text-ink mt-3 flex items-center justify-center gap-2">
          {price?.toLocaleString('fr-FR')} <span className="text-lg">FCFA</span>
        </div>
        {feeIncluded > 0 && <p className="text-sm text-ink-2 mt-1">{t("dont {n} F de frais d'annulation d'une course précédente", { n: feeIncluded.toLocaleString('fr-FR') })}</p>}
        <div className="mt-2 flex items-center justify-center gap-2"><PaymentIcon method={paymentMethod} size={18} /><PaymentStatus method={paymentMethod} state={paymentState} /></div>

        <div className="border-t border-ink-line mt-6 pt-5">
          <p className="text-base font-semibold text-ink" id="rate-label">{driver?.name ? t("Comment s'est passée ta course avec {name} ?", { name: driver.name.split(' ')[0] }) : t("Comment s'est passée ta course ?")}</p>
          <div className="flex justify-center mt-2" role="radiogroup" aria-labelledby="rate-label">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} role="radio" aria-checked={score === s} aria-label={t(s > 1 ? '{n} étoiles' : '{n} étoile', { n: s })}
                onClick={() => { setScore(s); setTags([]); }}
                className="w-12 h-12 flex items-center justify-center text-ink active:scale-90 transition-transform">
                <Icon name="star" size={32} strokeWidth={1.5} filled={s <= score} />
              </button>
            ))}
          </div>

          {score > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-3" role="group" aria-label={score >= 4 ? t('Ce qui était bien') : t("Ce qui n'allait pas")}>
              {tagList.map(tag => (
                <button key={tag} onClick={() => toggle(tag)} aria-pressed={tags.includes(tag)}
                  className={`h-9 px-3 rounded-full text-sm border ${tags.includes(tag) ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-ink-line'}`}>
                  {t(tag)}
                </button>
              ))}
            </div>
          )}

          {score >= 4 && (
            <div className="mt-6">
              <p className="text-base font-semibold text-ink" id="tip-label">{t('Un pourboire ?')}</p>
              <p className="text-sm text-ink-2">{t('À donner au chauffeur, en plus du prix de la course')}</p>
              <div className="grid grid-cols-4 gap-2 mt-3" role="radiogroup" aria-labelledby="tip-label">
                {TIPS.map(amount => (
                  <button key={amount} role="radio" aria-checked={tip === amount} onClick={() => setTip(amount)}
                    className={`h-11 px-1 rounded-lg text-sm font-semibold whitespace-nowrap ${tip === amount ? 'bg-ink text-white' : 'bg-ink-fill text-ink'}`}>
                    {amount === 0 ? t('Non') : `${amount} F`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pt-3 flex flex-col gap-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <button onClick={() => onSubmit({ score, tags, tip })} disabled={score === 0}
          className="h-12 bg-ink text-white text-base font-semibold rounded-lg active:bg-gray-800 disabled:bg-ink-fill disabled:text-ink-3">
          {t('Envoyer')}
        </button>
        <button onClick={onSkip} className="h-11 text-base font-semibold text-ink rounded-lg active:bg-ink-fill">{t('Plus tard')}</button>
      </div>
    </motion.div>
  );
}
