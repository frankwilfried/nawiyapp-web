import { create } from 'zustand';
import { en } from './en';

/**
 * Traduction légère : la phrase française sert de clé, le dictionnaire anglais donne la traduction.
 * Une phrase absente du dictionnaire reste en français (jamais de clé brute à l'écran).
 * Variables : t('Arrivée vers {time}', { time: '14:05' }).
 */
const STORAGE_KEY = 'nawiy_lang';
const DICTS = { en };
export const LANGUAGES = [{ id: 'fr', label: 'Français' }, { id: 'en', label: 'English' }];

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch { /* stockage indisponible */ }
  return typeof navigator !== 'undefined' && /^en\b/i.test(navigator.language || '') ? 'en' : 'fr';
}

export const useLangStore = create((set) => ({
  lang: initialLang(),
  setLang: (lang) => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* stockage indisponible */ }
    document.documentElement.lang = lang;
    set({ lang });
  },
}));

const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : text);

/** Traduit hors composant (toasts, callbacks) selon la langue courante. */
export function t(text, vars) {
  const dict = DICTS[useLangStore.getState().lang];
  return fill((dict && dict[text]) || text, vars);
}

/** Dans un composant : re-rend quand la langue change. */
export function useT() {
  const lang = useLangStore(s => s.lang);
  return (text, vars) => fill((DICTS[lang] && DICTS[lang][text]) || text, vars);
}

/** Locale pour les dates et nombres. */
export const locale = () => (useLangStore.getState().lang === 'en' ? 'en-GB' : 'fr-FR');
