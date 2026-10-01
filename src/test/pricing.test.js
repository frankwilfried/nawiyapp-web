import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { priceFor, etaMinutes, roadKm, offerBounds, CATEGORIES, commissionFor, cancellationFee, FREE_WAIT_MIN } from '../lib/pricing';

describe('tarification taxi', () => {
  it('applique minimum, prix au km et arrondi', () => {
    expect(priceFor('eco', 0.5)).toBe(1000);
    expect(priceFor('eco', 6.1)).toBe(2100);
    expect(priceFor('moto', 3.1)).toBe(700);
  });
  it('borne l\'offre du passager entre 70 % et 200 % du prix conseillé', () => {
    expect(offerBounds('eco', 2400)).toEqual({ min: 1600, max: 4800, step: 100 });
    expect(offerBounds('moto', 550)).toEqual({ min: 350, max: 1100, step: 50 });
    expect(offerBounds('moto', 300).min).toBe(200);
  });
  it('estime la distance par la route et la durée', () => {
    expect(roadKm({ lat: 4.05, lng: 9.70 }, { lat: 4.06, lng: 9.70 })).toBe(1.4);
    expect(etaMinutes('eco', 2)).toBe(8);
  });
});

describe("commission et frais d'annulation", () => {
  it('commission de 10 % arrondie', () => {
    expect(commissionFor(1100)).toBe(110);
    expect(commissionFor(1250)).toBe(125);
    expect(commissionFor(355)).toBe(36);
  });
  it("frais seulement après 5 min d'attente du chauffeur", () => {
    const now = Date.now();
    expect(cancellationFee('eco', null, now)).toBe(0);
    expect(cancellationFee('eco', now - 4 * 60000, now)).toBe(0);
    expect(cancellationFee('eco', now - 5 * 60000, now)).toBe(500);
    expect(cancellationFee('moto', now - 9 * 60000, now)).toBe(200);
    expect(cancellationFee('confort', new Date(now - 10 * 60000).toISOString(), now)).toBe(700);
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
        expect(offerBounds(cat, priceFor(cat, km))).toEqual(server.offerBounds(cat, server.priceFor(cat, km)));
        expect(commissionFor(priceFor(cat, km))).toBe(server.commissionFor(server.priceFor(cat, km)));
      }
      const arrived = Date.now() - 6 * 60000;
      expect(cancellationFee(cat, arrived)).toBe(server.cancellationFee(cat, arrived));
    }
    expect(server.FREE_WAIT_MIN).toBe(FREE_WAIT_MIN);
  });
});
