import { describe, it, expect } from 'vitest';
import { distanceM, bearingDeg, cardinal, relativeDirection, formatDistance } from '../lib/geo';

const A = { lat: 4.05, lng: 9.70 };

describe('radar de proximité', () => {
  it('mesure la distance et le cap', () => {
    const north = { lat: 4.0503, lng: 9.70 }; // ~33 m au nord
    expect(Math.round(distanceM(A, north))).toBe(33);
    expect(Math.round(bearingDeg(A, north))).toBe(0);
    expect(Math.round(bearingDeg(A, { lat: 4.05, lng: 9.7003 }))).toBe(90);
  });

  it('donne un point cardinal sans boussole', () => {
    expect(cardinal(44)).toBe('nord-est');
    expect(cardinal(359)).toBe('nord');
    expect(relativeDirection(90, null)).toBe("vers l'est");
    expect(relativeDirection(45, null)).toBe('vers le nord-est');
  });

  it('donne une direction relative au téléphone avec boussole', () => {
    expect(relativeDirection(90, 90)).toBe('devant toi');
    expect(relativeDirection(90, 0)).toBe('à ta droite');
    expect(relativeDirection(0, 90)).toBe('à ta gauche');
    expect(relativeDirection(270, 90)).toBe('derrière toi');
  });

  it('arrondit la distance affichée', () => {
    expect(formatDistance(23)).toBe('25 m');
    expect(formatDistance(2)).toBe('5 m');
    expect(formatDistance(1530)).toBe('1,5 km');
  });
});
