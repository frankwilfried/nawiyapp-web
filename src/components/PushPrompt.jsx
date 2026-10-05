import { useEffect, useState } from 'react';
import Icon from './Icon';
import { enablePush, pushPermission, pushSupported } from '../lib/push';
import { t } from '../i18n';

const DISMISS_KEY = 'nawiy_push_dismissed';
const wasDismissed = (scope) => { try { return localStorage.getItem(`${DISMISS_KEY}_${scope}`) === '1'; } catch { return false; } };

/**
 * Invitation à activer les notifications, montrée au moment où elles servent
 * (course demandée, chauffeur en ligne). Déjà autorisé : réabonne en silence et n'affiche rien.
 */
export default function PushPrompt({ scope, title, body, anonClientId, className = '' }) {
  const [state, setState] = useState(() => pushPermission());
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(() => wasDismissed(scope));

  // Autorisation déjà donnée : on rattache l'abonnement à cette session (identifiant passager, compte)
  useEffect(() => {
    if (pushPermission() === 'granted') enablePush({ anonClientId, prompt: false }).catch(() => {});
  }, [anonClientId]);

  if (!pushSupported() || hidden || state === 'granted' || state === 'unavailable' || state === 'unsupported') return null;

  if (state === 'denied') {
    return (
      <p className={`text-sm text-ink-2 flex items-start gap-2 ${className}`}>
        <Icon name="alert" size={16} className="mt-0.5 flex-shrink-0" />
        {t('Notifications bloquées : autorise-les dans les réglages du navigateur pour être prévenu.')}
      </p>
    );
  }

  const activate = async () => {
    setBusy(true);
    const result = await enablePush({ anonClientId }).catch(() => 'unavailable');
    setBusy(false);
    setState(result);
  };
  const dismiss = () => {
    try { localStorage.setItem(`${DISMISS_KEY}_${scope}`, '1'); } catch { /* stockage indisponible */ }
    setHidden(true);
  };

  return (
    <div className={`flex items-center gap-3 rounded-lg bg-ink-fill px-3 py-2.5 ${className}`}>
      <Icon name="bell" size={20} className="text-ink flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-sm text-ink-2">{body}</p>
      </div>
      <button onClick={activate} disabled={busy}
        className="h-10 px-3 rounded-lg bg-ink text-white text-sm font-semibold disabled:opacity-60 flex-shrink-0">
        {busy ? '…' : t('Activer')}
      </button>
      <button onClick={dismiss} aria-label={t('Plus tard')} className="w-10 h-10 -mr-1 flex items-center justify-center text-ink-2 flex-shrink-0">
        <Icon name="x" size={18} />
      </button>
    </div>
  );
}
