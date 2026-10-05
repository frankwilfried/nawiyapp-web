import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import { useOnline } from '../hooks/useOnline';
import { t } from '../i18n';

/**
 * Pastille hors ligne en haut à droite, sous la barre de recherche : le détail (ce qui marche encore)
 * s'affiche quelques secondes puis se replie pour ne pas cacher la carte ni les fiches.
 */
export default function OfflineBanner() {
  const online = useOnline();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (online || !expanded) return;
    const t = setTimeout(() => setExpanded(false), 6000);
    return () => clearTimeout(t);
  }, [online, expanded]);

  return (
    <AnimatePresence onExitComplete={() => setExpanded(true)}>
      {!online && (
        <motion.button type="button" role="status" layout onClick={() => setExpanded(e => !e)}
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          aria-expanded={expanded}
          className="fixed right-4 z-[85] max-w-[min(22rem,calc(100vw-2rem))] bg-ink text-white text-sm rounded-xl px-3 py-2 flex items-start gap-2 shadow-float text-left"
          style={{ top: 'calc(env(safe-area-inset-top) + 76px)' }}>
          <Icon name="wifiOff" size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">{t('Hors ligne')}</span>
            {expanded && <span> · {t("itinéraires disponibles, taxis et recherche d'adresses en attente de connexion")}</span>}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
