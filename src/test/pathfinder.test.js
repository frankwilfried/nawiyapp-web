import { describe, it, expect } from 'vitest';
import { findPath } from '../lib/pathfinder';

const graph = {
  nodes: [
    { id: 'A', name: 'Akwa',    lat: 4.05, lng: 9.71, type: 'carrefour' },
    { id: 'B', name: 'Bonaberi',lat: 4.06, lng: 9.70, type: 'quartier'  },
    { id: 'C', name: 'Deido',   lat: 4.07, lng: 9.72, type: 'carrefour' },
    { id: 'D', name: 'Isolated',lat: 4.08, lng: 9.73, type: 'autre'     },
  ],
  edges: [
    { from_point_id: 'A', to_point_id: 'B', transport: 'taxi_collectif', duration_min: 10, price_fcfa: 200, is_bidirectional: true  },
    { from_point_id: 'B', to_point_id: 'C', transport: 'moto_taxi',      duration_min: 5,  price_fcfa: 150, is_bidirectional: false },
    { from_point_id: 'A', to_point_id: 'C', transport: 'minibus',        duration_min: 20, price_fcfa: 300, is_bidirectional: true  },
  ],
};

describe('findPath', () => {
  it('trouve le chemin optimal A → C (via B, 15 min)', () => {
    const r = findPath(graph, 'A', 'C');
    expect(r.found).toBe(true);
    expect(r.total_duration_min).toBe(15);
    expect(r.path).toHaveLength(2);
    expect(r.path[0].transport).toBe('taxi_collectif');
    expect(r.path[1].transport).toBe('moto_taxi');
  });

  it('retourne le chemin inverse B → A si bidirectionnel', () => {
    const r = findPath(graph, 'B', 'A');
    expect(r.found).toBe(true);
    expect(r.total_duration_min).toBe(10);
  });

  it('emprunte un chemin alternatif quand sens unique bloqué (C→A→B)', () => {
    // B→C sens unique, mais C→A bidirectionnel et A→B bidirectionnel
    const r = findPath(graph, 'C', 'B');
    expect(r.found).toBe(true);
    // Chemin doit passer par A
    expect(r.path.some(s => s.from.id === 'A' || s.to.id === 'A')).toBe(true);
  });

  it('retourne SAME_POINT si départ = arrivée', () => {
    const r = findPath(graph, 'A', 'A');
    expect(r.found).toBe(false);
    expect(r.error).toBe('SAME_POINT');
  });

  it('retourne START_NOT_FOUND pour nœud inexistant', () => {
    const r = findPath(graph, 'Z', 'A');
    expect(r.found).toBe(false);
    expect(r.error).toBe('START_NOT_FOUND');
  });

  it('retourne END_NOT_FOUND pour destination inexistante', () => {
    const r = findPath(graph, 'A', 'Z');
    expect(r.found).toBe(false);
    expect(r.error).toBe('END_NOT_FOUND');
  });

  it('retourne NO_PATH pour nœud isolé', () => {
    const r = findPath(graph, 'A', 'D');
    expect(r.found).toBe(false);
    expect(r.error).toBe('NO_PATH');
  });

  it('calcule le prix total correctement', () => {
    const r = findPath(graph, 'A', 'C');
    expect(r.total_price_fcfa).toBe(350); // 200 + 150
  });

  it('retourne GRAPH_NOT_LOADED si graph null', () => {
    const r = findPath(null, 'A', 'B');
    expect(r.found).toBe(false);
    expect(r.error).toBe('GRAPH_NOT_LOADED');
  });

  it('supporte weightBy price_fcfa', () => {
    // Par prix : A→C direct (300) vs A→B→C (350) → direct gagne
    const r = findPath(graph, 'A', 'C', 'price_fcfa');
    expect(r.found).toBe(true);
    expect(r.path).toHaveLength(1);
    expect(r.path[0].transport).toBe('minibus');
  });
});
