import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { priceFor, etaMinutes, roadKm, CATEGORIES } from '../lib/pricing';

describe('tarification taxi', () => {
  it('applique minimum, prix au km et arrondi', () => {
    expect(priceFor('eco', 0.5)).toBe(1000);
    expect(priceFor('eco', 6.1)).toBe(2100);
    expect(priceFor('moto', 3.1)).toBe(700);
  });
  it('estime la distance par la route et la durée', () => {
    expect(roadKm({ lat: 4.05, lng: 9.70 }, { lat: 4.06, lng: 9.70 })).toBe(1.4);
    expect(etaMinutes('eco', 2)).toBe(8);
  });
});

// Le prix affiché doit être exactement celui calculé par le serveur
// (dépôts voisins : AppID/nawiyapp-web et AppID/nawiyapp-backend ; test ignoré si le backend est absent)
const backendPricing = resolve(process.cwd(), '../nawiyapp-backend/src/lib/pricing.js');
describe.skipIf(!existsSync(backendPricing))('parité front / serveur', () => {
  it('donne les mêmes prix et tarifs que nawiyapp-backend', () => {
    const server = createRequire(backendPricing)(backendPricing);
    expect(server.CATEGORIES).toEqual(CATEGORIES);
    for (const cat of Object.keys(CATEGORIES)) {
      for (const km of [0, 0.4, 1.3, 2.75, 7.4, 15, 32.9]) {
        expect(priceFor(cat, km)).toBe(server.priceFor(cat, km));
        expect(etaMinutes(cat, km)).toBe(server.etaMinutes(cat, km));
      }
    }
  });
});
