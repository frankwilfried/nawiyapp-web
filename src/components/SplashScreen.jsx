import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 bg-nawiy-dark flex flex-col items-center justify-center"
    >
      {/* Logo animé */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 180, delay: 0.1 }}
        className="flex flex-col items-center gap-5"
      >
        {/* Icône */}
        <div className="w-24 h-24 rounded-3xl bg-nawiy-green flex items-center justify-center shadow-2xl">
          <span className="text-5xl">🗺️</span>
        </div>

        {/* Nom */}
        <div className="text-center">
          <div className="text-white text-4xl font-black tracking-tight">Nawiy</div>
          <div className="text-nawiy-green text-sm font-semibold tracking-widest uppercase mt-1">
            Navigation locale
          </div>
        </div>

        {/* Villes */}
        <div className="flex gap-3 mt-2">
          {['Douala', 'Yaoundé'].map(c => (
            <div key={c} className="px-4 py-1.5 rounded-full bg-white/10 text-white/70 text-sm font-medium">
              {c}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Barre de chargement */}
      <motion.div
        className="absolute bottom-16 w-40 h-1 rounded-full bg-white/10 overflow-hidden"
      >
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="h-full w-full bg-nawiy-green rounded-full"
        />
      </motion.div>
    </motion.div>
  );
}
