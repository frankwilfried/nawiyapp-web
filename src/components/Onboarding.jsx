import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDES = [
  {
    emoji: '🗺️',
    title: 'Bienvenue sur NawiyApp',
    desc: 'Navigue dans ta ville avec les transports informels — taxis collectifs, moto-taxis, minibus.',
    bg: 'from-nawiy-green to-emerald-600',
  },
  {
    emoji: '🚕',
    title: 'Commande un taxi',
    desc: 'Demande une course en quelques secondes. Un chauffeur près de toi accepte et vient te chercher.',
    bg: 'from-gray-900 to-gray-800',
  },
  {
    emoji: '📍',
    title: 'Contribue aux données',
    desc: 'Enregistre tes trajets pour enrichir la carte. Ensemble on cartographie le transport camerounais.',
    bg: 'from-orange-500 to-amber-500',
  },
];

export default function Onboarding({ onDone }) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const last  = idx === SLIDES.length - 1;

  const next = () => {
    if (last) { onDone(); return; }
    setIdx(i => i + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.28 }}
          className={`flex-1 bg-gradient-to-br ${slide.bg} flex flex-col items-center justify-center px-8 text-white text-center`}
        >
          <div className="text-7xl mb-8 select-none">{slide.emoji}</div>
          <h1 className="text-2xl font-bold mb-4 leading-tight">{slide.title}</h1>
          <p className="text-white/80 text-base leading-relaxed max-w-xs">{slide.desc}</p>
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <div className="bg-white px-6 py-8 flex flex-col gap-4">
        {/* Indicateurs */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <div key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'bg-nawiy-green w-6' : 'bg-gray-200 w-2'}`}
            />
          ))}
        </div>

        <button onClick={next}
          className="w-full bg-nawiy-green text-white py-4 rounded-2xl font-bold text-base hover:bg-nawiy-dark transition active:scale-95">
          {last ? 'Commencer →' : 'Suivant →'}
        </button>

        {!last && (
          <button onClick={onDone} className="text-gray-400 text-sm text-center hover:text-gray-600 transition">
            Passer
          </button>
        )}
      </div>
    </motion.div>
  );
}
