import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { accountApi } from '../api/account.api';
import Icon from './Icon';

// Numéros d'urgence au Cameroun
const EMERGENCY = [
  { label: 'la police', number: '117' },
  { label: 'les sapeurs-pompiers', number: '118' },
];

// SMS groupé : Android accepte « ?body= », iPhone « &body= »
const smsHref = (phones, body) => {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return `sms:${phones.join(',')}${ios ? '&' : '?'}body=${encodeURIComponent(body)}`;
};

/**
 * Sécurité pendant une course : partager le suivi en direct, prévenir ses contacts d'urgence
 * par SMS (envoyé depuis le téléphone du passager), appeler les secours.
 */
export default function SafetySheet({ shareText, shareUrl, onClose }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const { data: contacts = [] } = useQuery({ queryKey: ['emergency-contacts'], queryFn: accountApi.contacts, enabled: isAuthenticated });
  const message = [shareText, shareUrl && `Suivre en direct : ${shareUrl}`].filter(Boolean).join('\n');
  const row = 'w-full flex items-center gap-4 py-3 border-b border-ink-line text-left active:bg-ink-fill -mx-2 px-2 rounded-lg';

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Ma course NawiyApp', text: shareText, url: shareUrl || undefined }); return; }
      catch (err) { if (err?.name === 'AbortError') return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  };

  return (
    <motion.div className="fixed inset-0 z-[70] bg-black/40 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="safety-title"
        initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-2xl px-4 pt-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between mb-1">
          <h2 id="safety-title" className="text-xl font-bold text-ink">Sécurité</h2>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-ink-2 active:bg-ink-fill">
            <Icon name="x" size={20} />
          </button>
        </div>
        <p className="text-sm text-ink-2 mb-2">Vérifie toujours la plaque avant de monter, et ne donne ton code qu'au bon chauffeur.</p>

        <button onClick={share} className={row}>
          <span className="w-10 h-10 rounded-full bg-ink-fill text-ink flex items-center justify-center"><Icon name="share" size={18} /></span>
          <span>
            <span className="block text-base text-ink">Partager mon trajet</span>
            <span className="block text-sm text-ink-2">{shareUrl ? 'Lien de suivi en direct, chauffeur et plaque' : 'Chauffeur, plaque et destination'}</span>
          </span>
        </button>

        {contacts.length > 0 ? (
          <a href={smsHref(contacts.map(c => c.phone), message)} className={row}>
            <span className="w-10 h-10 rounded-full bg-ink-fill text-ink flex items-center justify-center"><Icon name="message" size={18} /></span>
            <span>
              <span className="block text-base text-ink">Prévenir mes contacts</span>
              <span className="block text-sm text-ink-2">SMS à {contacts.map(c => c.name).join(', ')}</span>
            </span>
          </a>
        ) : (
          <Link to={isAuthenticated ? '/compte/urgence' : '/login?next=/compte/urgence'} className={row}>
            <span className="w-10 h-10 rounded-full bg-ink-fill text-ink flex items-center justify-center"><Icon name="users" size={18} /></span>
            <span>
              <span className="block text-base text-ink">Ajouter des contacts d'urgence</span>
              <span className="block text-sm text-ink-2">{isAuthenticated ? 'Pour les prévenir en un geste' : 'Connecte-toi pour les enregistrer'}</span>
            </span>
          </Link>
        )}

        {EMERGENCY.map(e => (
          <a key={e.number} href={`tel:${e.number}`} className={row}>
            <span className="w-10 h-10 rounded-full bg-red-50 text-red-700 flex items-center justify-center"><Icon name="phone" size={18} /></span>
            <span><span className="block text-base text-ink">Appeler {e.label}</span><span className="block text-sm text-ink-2">{e.number}</span></span>
          </a>
        ))}
      </motion.div>
    </motion.div>
  );
}
