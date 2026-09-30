import { describe, it, expect } from 'vitest';
import { planTrip, motoPrice, announceFor, realisticEdge } from '../lib/itinerary';
import { findPath } from '../lib/pathfinder';

// Trois carrefours alignés (~1,1 km entre chaque)
const A = { id: 1, name: 'Akwa',     lat: 4.050, lng: 9.700 };
const B = { id: 2, name: 'Ndokotti', lat: 4.060, lng: 9.700 };
const C = { id: 3, name: 'Deido',    lat: 4.070, lng: 9.700 };
const edge = (from, to, transport, duration_min, price_fcfa) =>
  ({ from_point_id: from, to_point_id: to, transport, duration_min, price_fcfa, is_bidirectional: true });

const graph = {
  nodes: [A, B, C],
  edges: [
    edge(1, 2, 'taxi_collectif', 8, 200),
    edge(2, 3, 'moto_taxi', 5, 150),
    edge(1, 3, 'taxi_collectif', 15, 250),
  ],
};
const T0 = new Date('2026-09-30T14:00:00').getTime();

describe('findPath avec coût de montée', () => {
  it('préfère le trajet direct quand le changement coûte cher', () => {
    // Sans pénalité : A→B→C = 13 min ; avec : 13 + 2×6 = 25 > 15 + 6 = 21
    expect(findPath(graph, 1, 3).path).toHaveLength(2);
    const r = findPath(graph, 1, 3, 'duration_min', { boardingCost: () => 6 });
    expect(r.path).toHaveLength(1);
    expect(r.total_duration_min).toBe(15); // la pénalité n'entre pas dans la durée affichée
  });
});

describe('planTrip', () => {
  it('construit un trajet entre deux carrefours du graphe, sans marche', () => {
    const r = planTrip(graph, A, B, { departAt: T0 });
    expect(r.legs.map(l => l.kind)).toEqual(['ride']);
    expect(r.legs[0].transport).toBe('taxi_collectif');
    expect(r.legs[0].announce).toBe('« Ndokotti, 200 »');
    expect(r.total_price_fcfa).toBe(200);
    expect(r.changes).toBe(0);
    // 4 min d'attente + 8 min de trajet
    expect(r.total_duration_min).toBe(12);
    expect(r.arriveAt - T0).toBe(12 * 60_000);
  });

  it('ajoute la marche au début et à la fin pour des lieux proches des carrefours', () => {
    const home = { id: '_gps', name: 'Ma position', lat: 4.052, lng: 9.700 }; // ~220 m de A
    const shop = { id: 'gp_x', name: 'Boutique', lat: 4.061, lng: 9.701 };   // ~150 m de B
    const r = planTrip(graph, home, shop, { departAt: T0 });
    expect(r.legs.map(l => l.kind)).toEqual(['walk', 'ride', 'walk']);
    expect(r.legs[0].to).toBe(A);
    expect(r.legs[2].from).toBe(B);
  });

  it('insère un changement entre deux véhicules', () => {
    const g = { nodes: [A, B, C], edges: [edge(1, 2, 'taxi_collectif', 8, 200), edge(2, 3, 'moto_taxi', 5, 150)] };
    const r = planTrip(g, A, C, { departAt: T0 });
    expect(r.legs.map(l => l.kind)).toEqual(['ride', 'change', 'ride']);
    expect(r.changes).toBe(1);
    expect(r.total_price_fcfa).toBe(350);
    // les étapes s'enchaînent sans trou
    r.legs.slice(1).forEach((l, i) => expect(l.startAt).toBe(r.legs[i].endAt));
  });

  it('propose une moto pour le dernier kilomètre quand la destination est loin du graphe', () => {
    const far = { id: 'gp_far', name: 'Loin', lat: 4.090, lng: 9.700 }; // ~2,2 km de C
    const r = planTrip(graph, A, far, { departAt: T0 });
    const last = r.legs.at(-1);
    expect(last.kind).toBe('ride');
    expect(last.transport).toBe('moto_taxi');
    expect(last.estimated).toBe(true);
    expect(r.legs.at(-2).kind).toBe('change');
  });

  it('fusionne deux tronçons moto consécutifs en une seule course', () => {
    const g = { nodes: [A, B, C], edges: [edge(1, 2, 'moto_taxi', 6, 150), edge(2, 3, 'moto_taxi', 5, 150)] };
    const r = planTrip(g, A, C, { departAt: T0 });
    expect(r.legs.map(l => l.kind)).toEqual(['ride']);
    expect(r.legs[0]).toMatchObject({ from: A, to: C, minutes: 11, price: 300 });
    expect(r.legs[0].announce).toContain('Deido');
    expect(r.changes).toBe(0);
  });

  it('transforme une liaison « a_pied » du graphe en marche, sans changement autour', () => {
    const g = { nodes: [A, B, C], edges: [edge(1, 2, 'taxi_collectif', 8, 200), edge(2, 3, 'a_pied', 6, 0)] };
    const r = planTrip(g, A, C, { departAt: T0 });
    expect(r.legs.map(l => l.kind)).toEqual(['ride', 'walk']);
    expect(r.legs[1].minutes).toBe(6);
    expect(r.changes).toBe(0);
  });

  it('corrige une durée saisie plus rapide que la voiture (données OSRM)', () => {
    expect(realisticEdge({ transport: 'moto_taxi', duration_min: 4, road_duration_min: 9 }))
      .toMatchObject({ duration_min: 10, corrected: true });
    const ok = { transport: 'taxi_collectif', duration_min: 12, road_duration_min: 5 };
    expect(realisticEdge(ok)).toBe(ok);
    const g = { nodes: [A, B], edges: [{ ...edge(1, 2, 'taxi_collectif', 3, 200), road_duration_min: 10 }] };
    expect(planTrip(g, A, B, { departAt: T0 }).legs[0].minutes).toBe(15);
  });

  it('va à pied quand départ et arrivée sont très proches', () => {
    const near = { id: 'x', name: 'À côté', lat: 4.053, lng: 9.700 };
    expect(planTrip(graph, A, near).legs.map(l => l.kind)).toEqual(['walk']);
  });

  it('allonge les durées aux heures de pointe', () => {
    const normal = planTrip(graph, A, B, { departAt: T0 });
    const peak   = planTrip(graph, A, B, { departAt: T0, peak: true });
    expect(peak.total_duration_min).toBeGreaterThan(normal.total_duration_min);
  });

  it('renvoie null sans graphe', () => {
    expect(planTrip({ nodes: [], edges: [] }, A, B)).toBeNull();
  });
});

describe('helpers', () => {
  it('arrondit le prix moto à 50 F avec un minimum de 100 F', () => {
    expect(motoPrice(0.1)).toBe(150);
    expect(motoPrice(2)).toBe(300);
    expect(motoPrice(0) % 50).toBe(0);
  });
  it('formule l\'annonce selon le mode', () => {
    expect(announceFor('minibus', 'Bonabéri', 300)).toContain('chargeur');
    expect(announceFor('moto_taxi', 'Kotto', 200)).toContain('fixe le prix');
  });
});
