import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findNearestNode } from '../lib/routing';

// findNearestNode est une fonction pure qui ne fait pas de fetch
// On teste uniquement cette partie sans mocker OSRM

const nodes = [
  { id: 'A', name: 'Akwa',     lat: 4.0511, lng: 9.7085, type: 'carrefour' },
  { id: 'B', name: 'Bonaberi', lat: 4.0600, lng: 9.7000, type: 'quartier'  },
  { id: 'C', name: 'Deido',    lat: 4.0700, lng: 9.7200, type: 'carrefour' },
];

describe('findNearestNode', () => {
  it('trouve le nœud le plus proche', () => {
    // Position très proche de Akwa
    const result = findNearestNode(4.051, 9.708, nodes);
    expect(result).not.toBeNull();
    expect(result.node.id).toBe('A');
  });

  it('retourne les minutes de marche et la distance', () => {
    const result = findNearestNode(4.051, 9.708, nodes);
    expect(result.walkMinutes).toBeGreaterThanOrEqual(0);
    expect(result.distanceKm).toBeGreaterThanOrEqual(0);
  });

  it('retourne null si nodes est vide', () => {
    const result = findNearestNode(4.051, 9.708, []);
    expect(result).toBeNull();
  });

  it('retourne null si nodes est null', () => {
    const result = findNearestNode(4.051, 9.708, null);
    expect(result).toBeNull();
  });

  it('choisit B quand la position est près de Bonaberi', () => {
    const result = findNearestNode(4.060, 9.700, nodes);
    expect(result.node.id).toBe('B');
  });
});
