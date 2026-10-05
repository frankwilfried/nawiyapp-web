import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { accountApi } from '../api/account.api';
import Icon from '../components/Icon';
import { prettyPhone } from '../lib/phone';
import { LANGUAGES, t, useLangStore } from '../i18n';

function Row({ to, icon, label, hint }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 min-h-14 py-2 active:bg-ink-fill">
      <Icon name={icon} size={20} className="text-ink flex-shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-base text-ink">{label}</span>
        {hint && <span className="block text-sm text-ink-2">{hint}</span>}
      </span>
      <Icon name="chevronRight" size={18} className="text-ink-3" />
    </Link>
  );
}

/** Onglet « Compte » : connexion, courses, sécurité, documents légaux. */
export default function Account() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { lang, setLang } = useLangStore();
  const { data: fees } = useQuery({ queryKey: ['fees'], queryFn: accountApi.fees, enabled: isAuthenticated });

  return (
    <div className="min-h-screen bg-[#F6F6F6] pb-24">
      <header className="bg-white px-4 pb-5" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
        <h1 className="text-2xl font-bold text-ink">{t('Compte')}</h1>
        {isAuthenticated ? (
          <div className="flex items-center gap-3 mt-4">
            <span className="w-14 h-14 rounded-full bg-ink-fill text-ink text-xl font-bold flex items-center justify-center" aria-hidden="true">
              {(user?.full_name || '?').charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-ink truncate">{user?.full_name || t('Mon compte')}</p>
              <p className="text-sm text-ink-2 truncate">{prettyPhone(user?.phone) || user?.email}</p>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-base text-ink-2">{t("Connecte-toi pour retrouver tes courses, tes reçus et tes contacts d'urgence.")}</p>
            <button onClick={() => navigate('/login?next=/compte')}
              className="w-full h-12 mt-4 bg-ink text-white text-base font-semibold rounded-lg active:bg-gray-800">
              {t('Se connecter avec mon numéro')}
            </button>
          </div>
        )}
      </header>

      {fees > 0 && (
        <p className="mx-4 mt-4 text-sm bg-amber-100 text-amber-900 rounded-lg px-3 py-2" role="status">
          {t("{n} F de frais d'annulation seront ajoutés à ta prochaine course.", { n: fees.toLocaleString('fr-FR') })}
        </p>
      )}

      {isAuthenticated && (
        <nav aria-label={t('Mon compte')} className="bg-white mt-4 divide-y divide-ink-line">
          <Row to="/courses" icon="clock" label={t('Mes courses')} hint={t('Historique et reçus')} />
          <Row to="/compte/urgence" icon="shield" label={t("Contacts d'urgence")} hint={t('Prévenus en un geste pendant une course')} />
        </nav>
      )}

      <section aria-labelledby="lang-title" className="bg-white mt-4 px-4 py-3">
        <h2 id="lang-title" className="text-sm font-semibold text-ink mb-2">{t('Langue')}</h2>
        <div className="flex gap-2" role="radiogroup" aria-labelledby="lang-title">
          {LANGUAGES.map(l => (
            <button key={l.id} role="radio" aria-checked={lang === l.id} onClick={() => setLang(l.id)} lang={l.id}
              className={`flex-1 h-11 rounded-full text-sm font-semibold ${lang === l.id ? 'bg-ink text-white' : 'bg-ink-fill text-ink'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <nav aria-label={t('Informations')} className="bg-white mt-4 divide-y divide-ink-line">
        <Row to="/taxi/driver" icon="taxi" label={t('Conduire avec NawiyApp')} />
        <Row to="/conditions" icon="flag" label={t("Conditions d'utilisation")} />
        <Row to="/confidentialite" icon="shield" label={t('Politique de confidentialité')} />
      </nav>

      {isAuthenticated && (
        <button onClick={() => { logout(); navigate('/'); }}
          className="w-full bg-white mt-4 min-h-14 px-4 text-left text-base font-semibold text-red-700 active:bg-red-50">
          {t('Se déconnecter')}
        </button>
      )}
    </div>
  );
}
