import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { en } from '../i18n/en';
import { t, useLangStore } from '../i18n';
import { PLACE_TYPE_LABELS } from '../lib/placeTypes';
import { PASSENGER_REPLIES } from '../lib/chat';
import { MODES } from '../lib/modes';

// Toutes les phrases passées littéralement à t('…') dans le code
function phrasesInSource() {
  const root = resolve(process.cwd(), 'src');
  const found = new Set();
  const walk = (dir) => readdirSync(dir).forEach(f => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!/i18n|test/.test(f)) walk(p); return; }
    if (!/\.jsx?$/.test(f)) return;
    const src = readFileSync(p, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) found.add(m[2].replace(/\\'/g, "'"));
    // t(cond ? 'a' : 'b') et t({ … }[clé]) : chaque chaîne du groupe
    for (const m of src.matchAll(/\bt\(\s*(?:[^'"()]*\?\s*)(['"])((?:\\.|(?!\1).)*)\1\s*:\s*(['"])((?:\\.|(?!\3).)*)\3/g)) {
      found.add(m[2].replace(/\\'/g, "'")); found.add(m[4].replace(/\\'/g, "'"));
    }
  });
  walk(root);
  return [...found].filter(Boolean);
}
const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe('traduction anglaise', () => {
  beforeEach(() => useLangStore.setState({ lang: 'fr' }));

  it('chaque phrase du code a sa traduction', () => {
    const missing = phrasesInSource().filter(p => !(p in en));
    expect(missing).toEqual([]);
  });

  it('libellés indirects traduits (types de lieux, modes, réponses rapides)', () => {
    const labels = [...Object.values(PLACE_TYPE_LABELS), ...PASSENGER_REPLIES, ...Object.values(MODES).map(m => m.label)];
    expect(labels.filter(l => !(l in en))).toEqual([]);
  });

  it('mêmes variables en français et en anglais', () => {
    const bad = Object.entries(en).filter(([fr, eng]) => vars(fr).join() !== vars(eng).join()).map(([fr]) => fr);
    expect(bad).toEqual([]);
  });

  it('bascule de langue et variables', () => {
    expect(t('Où vas-tu ?')).toBe('Où vas-tu ?');
    useLangStore.setState({ lang: 'en' });
    expect(t('Où vas-tu ?')).toBe('Where to?');
    expect(t('Arrive dans {n} min', { n: 4 })).toBe('Arriving in 4 min');
    expect(t('Phrase inconnue')).toBe('Phrase inconnue');
  });
});
