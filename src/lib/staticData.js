// Données statiques embarquées — graphe complet Douala + Yaoundé
// Toutes les routes sont bidirectionnelles (is_bidirectional: true)
import ENRICHMENT from './graphEnrichment.json' with { type: 'json' };

export const STATIC_CITIES = [
  { id: 1, slug: 'douala',  name: 'Douala',  lat_center: 4.0511, lng_center: 9.7085, zoom_default: 13 },
  { id: 2, slug: 'yaounde', name: 'Yaoundé', lat_center: 3.8667, lng_center: 11.5167, zoom_default: 13 },
];

export const STATIC_FOCAL_POINTS = {
  douala: [
    { id: 1,  city_slug: 'douala', name: 'Akwa',              slug: 'akwa',            lat: 4.0511, lng: 9.7085, type: 'quartier'   },
    { id: 2,  city_slug: 'douala', name: 'Bonanjo',           slug: 'bonanjo',         lat: 4.0469, lng: 9.6989, type: 'quartier'   },
    { id: 3,  city_slug: 'douala', name: 'Bonaberi',          slug: 'bonaberi',        lat: 4.0650, lng: 9.6711, type: 'quartier'   },
    { id: 4,  city_slug: 'douala', name: 'Ndokotti',          slug: 'ndokotti',        lat: 4.0561, lng: 9.7150, type: 'carrefour'  },
    { id: 5,  city_slug: 'douala', name: 'Deido',             slug: 'deido',           lat: 4.0620, lng: 9.7200, type: 'quartier'   },
    { id: 6,  city_slug: 'douala', name: 'Bassa',             slug: 'bassa',           lat: 4.0230, lng: 9.7420, type: 'quartier'   },
    { id: 7,  city_slug: 'douala', name: 'Makepe',            slug: 'makepe',          lat: 4.0800, lng: 9.7350, type: 'quartier'   },
    { id: 8,  city_slug: 'douala', name: 'Logbessou',         slug: 'logbessou',       lat: 4.1100, lng: 9.7480, type: 'quartier'   },
    { id: 9,  city_slug: 'douala', name: 'Carrefour Elf',     slug: 'carrefour-elf',   lat: 4.0700, lng: 9.7300, type: 'carrefour'  },
    { id: 10, city_slug: 'douala', name: 'Marché Central',    slug: 'marche-central',  lat: 4.0530, lng: 9.7100, type: 'marche'     },
    { id: 11, city_slug: 'douala', name: 'Marché Sandaga',    slug: 'marche-sandaga',  lat: 4.0510, lng: 9.7130, type: 'marche'     },
    { id: 12, city_slug: 'douala', name: 'Marché Mboppi',     slug: 'marche-mboppi',   lat: 4.0580, lng: 9.7200, type: 'marche'     },
    { id: 13, city_slug: 'douala', name: 'Gare Bonaberi',     slug: 'gare-bonaberi',   lat: 4.0680, lng: 9.6720, type: 'transport'  },
    { id: 14, city_slug: 'douala', name: 'Gare Centrale',     slug: 'gare-centrale',   lat: 4.0460, lng: 9.7060, type: 'transport'  },
    { id: 15, city_slug: 'douala', name: 'Aéroport Douala',   slug: 'aeroport-douala', lat: 4.0061, lng: 9.7192, type: 'transport'  },
    { id: 16, city_slug: 'douala', name: 'Université Douala', slug: 'univ-douala',     lat: 4.0850, lng: 9.7400, type: 'universite' },
    { id: 17, city_slug: 'douala', name: 'Kotto',             slug: 'kotto',           lat: 4.0350, lng: 9.7550, type: 'quartier'   },
    { id: 18, city_slug: 'douala', name: 'PK8',               slug: 'pk8',             lat: 4.0180, lng: 9.7300, type: 'carrefour'  },
    { id: 19, city_slug: 'douala', name: 'PK12',              slug: 'pk12',            lat: 3.9900, lng: 9.7200, type: 'carrefour'  },
    { id: 20, city_slug: 'douala', name: 'PK14',              slug: 'pk14',            lat: 3.9700, lng: 9.7100, type: 'carrefour'  },
    { id: 21, city_slug: 'douala', name: 'Bonamoussadi',      slug: 'bonamoussadi',    lat: 4.0900, lng: 9.7420, type: 'quartier'   },
    { id: 22, city_slug: 'douala', name: 'Bépanda',           slug: 'bepanda',         lat: 4.0650, lng: 9.7250, type: 'quartier'   },
    { id: 23, city_slug: 'douala', name: 'Ange Raphaël',      slug: 'ange-raphael',    lat: 4.0480, lng: 9.7050, type: 'carrefour'  },
    { id: 24, city_slug: 'douala', name: 'Denver',            slug: 'denver',          lat: 4.0600, lng: 9.7180, type: 'quartier'   },
    { id: 25, city_slug: 'douala', name: 'New Bell',          slug: 'new-bell',        lat: 4.0430, lng: 9.7070, type: 'quartier'   },
    { id: 26, city_slug: 'douala', name: 'Yassa',             slug: 'yassa',           lat: 4.0100, lng: 9.7600, type: 'quartier'   },
    { id: 27, city_slug: 'douala', name: 'Cité des Palmiers', slug: 'cite-palmiers',   lat: 4.0750, lng: 9.7320, type: 'quartier'   },
    { id: 28, city_slug: 'douala', name: 'Rond-Point Deido',  slug: 'rondpoint-deido', lat: 4.0600, lng: 9.7190, type: 'carrefour'  },
  ],
  yaounde: [
    { id: 29, city_slug: 'yaounde', name: 'Mvog-Ada',           slug: 'mvog-ada',      lat: 3.8620, lng: 11.5100, type: 'quartier'   },
    { id: 30, city_slug: 'yaounde', name: 'Nlongkak',           slug: 'nlongkak',      lat: 3.8750, lng: 11.5200, type: 'quartier'   },
    { id: 31, city_slug: 'yaounde', name: 'Bastos',             slug: 'bastos',        lat: 3.8900, lng: 11.5100, type: 'quartier'   },
    { id: 32, city_slug: 'yaounde', name: 'Mvan',               slug: 'mvan',          lat: 3.8400, lng: 11.5000, type: 'quartier'   },
    { id: 33, city_slug: 'yaounde', name: 'Marché Mokolo',      slug: 'marche-mokolo', lat: 3.8700, lng: 11.5150, type: 'marche'     },
    { id: 34, city_slug: 'yaounde', name: 'Université Yaoundé I', slug: 'univ-yde1',   lat: 3.8680, lng: 11.5000, type: 'universite' },
    { id: 35, city_slug: 'yaounde', name: 'Gare Yaoundé',       slug: 'gare-yaounde',  lat: 3.8640, lng: 11.5180, type: 'transport'  },
    { id: 36, city_slug: 'yaounde', name: 'Centre Ville',       slug: 'centre-ville',  lat: 3.8667, lng: 11.5167, type: 'carrefour'  },
    { id: 37, city_slug: 'yaounde', name: 'Biyem-Assi',         slug: 'biyem-assi',    lat: 3.8550, lng: 11.4980, type: 'quartier'   },
    { id: 38, city_slug: 'yaounde', name: 'Messa',              slug: 'messa',         lat: 3.8820, lng: 11.5080, type: 'quartier'   },
    { id: 39, city_slug: 'yaounde', name: 'Essos',              slug: 'essos',         lat: 3.8600, lng: 11.5320, type: 'quartier'   },
    { id: 40, city_slug: 'yaounde', name: 'Nkol Eton',          slug: 'nkol-eton',     lat: 3.8480, lng: 11.5220, type: 'quartier'   },
    { id: 41, city_slug: 'yaounde', name: 'Brasseries',         slug: 'brasseries',    lat: 3.8720, lng: 11.5280, type: 'carrefour'  },
    { id: 42, city_slug: 'yaounde', name: 'Marché Mfoundi',     slug: 'marche-mfoundi',lat: 3.8660, lng: 11.5200, type: 'marche'     },
  ],
};

// ─── Routes Douala ───────────────────────────────────────────────────────────
// Toutes bidirectionnelles — le pathfinder utilise les deux sens
const _douala_routes_base = [
  // Centre : Akwa ↔ voisins
  { from: 1,  to: 2,  transport: 'taxi_collectif', min: 10, fcfa: 200 }, // Akwa ↔ Bonanjo
  { from: 1,  to: 4,  transport: 'taxi_collectif', min: 8,  fcfa: 200 }, // Akwa ↔ Ndokotti
  { from: 1,  to: 10, transport: 'moto_taxi',      min: 5,  fcfa: 150 }, // Akwa ↔ Marché Central
  { from: 1,  to: 11, transport: 'moto_taxi',      min: 4,  fcfa: 100 }, // Akwa ↔ Marché Sandaga
  { from: 1,  to: 23, transport: 'taxi_collectif', min: 7,  fcfa: 200 }, // Akwa ↔ Ange Raphaël
  { from: 1,  to: 25, transport: 'taxi_collectif', min: 12, fcfa: 200 }, // Akwa ↔ New Bell
  { from: 1,  to: 14, transport: 'moto_taxi',      min: 8,  fcfa: 150 }, // Akwa ↔ Gare Centrale

  // Bonanjo ↔ voisins
  { from: 2,  to: 14, transport: 'moto_taxi',      min: 6,  fcfa: 150 }, // Bonanjo ↔ Gare Centrale
  { from: 2,  to: 23, transport: 'taxi_collectif', min: 8,  fcfa: 200 }, // Bonanjo ↔ Ange Raphaël
  { from: 2,  to: 25, transport: 'taxi_collectif', min: 10, fcfa: 200 }, // Bonanjo ↔ New Bell

  // Bonaberi ↔ centre (pont sur Wouri)
  { from: 3,  to: 1,  transport: 'minibus',        min: 25, fcfa: 300 }, // Bonaberi ↔ Akwa
  { from: 3,  to: 13, transport: 'moto_taxi',      min: 5,  fcfa: 100 }, // Bonaberi ↔ Gare Bonaberi
  { from: 3,  to: 2,  transport: 'minibus',        min: 30, fcfa: 300 }, // Bonaberi ↔ Bonanjo

  // Ndokotti ↔ voisins (nœud central)
  { from: 4,  to: 5,  transport: 'taxi_collectif', min: 10, fcfa: 200 }, // Ndokotti ↔ Deido
  { from: 4,  to: 22, transport: 'taxi_collectif', min: 12, fcfa: 200 }, // Ndokotti ↔ Bépanda
  { from: 4,  to: 12, transport: 'moto_taxi',      min: 7,  fcfa: 150 }, // Ndokotti ↔ Marché Mboppi
  { from: 4,  to: 24, transport: 'taxi_collectif', min: 8,  fcfa: 200 }, // Ndokotti ↔ Denver
  { from: 4,  to: 28, transport: 'moto_taxi',      min: 5,  fcfa: 100 }, // Ndokotti ↔ Rond-Point Deido

  // Deido ↔ voisins
  { from: 5,  to: 7,  transport: 'taxi_collectif', min: 15, fcfa: 200 }, // Deido ↔ Makepe
  { from: 5,  to: 9,  transport: 'moto_taxi',      min: 8,  fcfa: 150 }, // Deido ↔ Carrefour Elf
  { from: 5,  to: 28, transport: 'moto_taxi',      min: 5,  fcfa: 100 }, // Deido ↔ Rond-Point Deido
  { from: 5,  to: 22, transport: 'taxi_collectif', min: 10, fcfa: 200 }, // Deido ↔ Bépanda

  // Bassa ↔ voisins (Axe Bassa)
  { from: 6,  to: 17, transport: 'taxi_collectif', min: 12, fcfa: 200 }, // Bassa ↔ Kotto
  { from: 6,  to: 18, transport: 'minibus',        min: 20, fcfa: 250 }, // Bassa ↔ PK8
  { from: 6,  to: 15, transport: 'taxi_collectif', min: 15, fcfa: 200 }, // Bassa ↔ Aéroport

  // Makepe ↔ voisins
  { from: 7,  to: 8,  transport: 'taxi_collectif', min: 15, fcfa: 200 }, // Makepe ↔ Logbessou
  { from: 7,  to: 21, transport: 'taxi_collectif', min: 10, fcfa: 200 }, // Makepe ↔ Bonamoussadi
  { from: 7,  to: 16, transport: 'minibus',        min: 20, fcfa: 250 }, // Makepe ↔ Université
  { from: 7,  to: 27, transport: 'taxi_collectif', min: 8,  fcfa: 200 }, // Makepe ↔ Cité des Palmiers
  { from: 7,  to: 9,  transport: 'taxi_collectif', min: 10, fcfa: 200 }, // Makepe ↔ Carrefour Elf

  // Logbessou ↔ voisins
  { from: 8,  to: 21, transport: 'taxi_collectif', min: 12, fcfa: 200 }, // Logbessou ↔ Bonamoussadi
  { from: 8,  to: 16, transport: 'taxi_collectif', min: 15, fcfa: 200 }, // Logbessou ↔ Université

  // Carrefour Elf ↔ voisins
  { from: 9,  to: 27, transport: 'moto_taxi',      min: 6,  fcfa: 150 }, // Elf ↔ Cité des Palmiers
  { from: 9,  to: 22, transport: 'taxi_collectif', min: 8,  fcfa: 200 }, // Elf ↔ Bépanda

  // Marchés ↔ voisins
  { from: 10, to: 11, transport: 'a_pied',         min: 3,  fcfa: 0   }, // Marché Central ↔ Sandaga (à pied)
  { from: 10, to: 23, transport: 'moto_taxi',      min: 5,  fcfa: 100 }, // Marché Central ↔ Ange Raphaël
  { from: 11, to: 25, transport: 'moto_taxi',      min: 5,  fcfa: 100 }, // Sandaga ↔ New Bell
  { from: 12, to: 5,  transport: 'moto_taxi',      min: 7,  fcfa: 150 }, // Mboppi ↔ Deido
  { from: 12, to: 24, transport: 'moto_taxi',      min: 5,  fcfa: 100 }, // Mboppi ↔ Denver

  // Gares ↔ voisins
  { from: 13, to: 3,  transport: 'moto_taxi',      min: 5,  fcfa: 100 }, // Gare Bonaberi ↔ Bonaberi
  { from: 14, to: 2,  transport: 'moto_taxi',      min: 6,  fcfa: 150 }, // Gare Centrale ↔ Bonanjo
  { from: 14, to: 25, transport: 'taxi_collectif', min: 8,  fcfa: 200 }, // Gare Centrale ↔ New Bell

  // Aéroport ↔ voisins
  { from: 15, to: 1,  transport: 'taxi_collectif', min: 30, fcfa: 500 }, // Aéroport ↔ Akwa
  { from: 15, to: 18, transport: 'minibus',        min: 15, fcfa: 300 }, // Aéroport ↔ PK8

  // Université ↔ voisins
  { from: 16, to: 21, transport: 'moto_taxi',      min: 8,  fcfa: 150 }, // Université ↔ Bonamoussadi
  { from: 16, to: 27, transport: 'taxi_collectif', min: 10, fcfa: 200 }, // Université ↔ Cité des Palmiers

  // Axe Kotto / PK / Yassa
  { from: 17, to: 6,  transport: 'taxi_collectif', min: 12, fcfa: 200 }, // Kotto ↔ Bassa
  { from: 17, to: 26, transport: 'taxi_collectif', min: 15, fcfa: 200 }, // Kotto ↔ Yassa
  { from: 18, to: 19, transport: 'minibus',        min: 15, fcfa: 250 }, // PK8 ↔ PK12
  { from: 19, to: 20, transport: 'minibus',        min: 10, fcfa: 200 }, // PK12 ↔ PK14
  { from: 18, to: 6,  transport: 'minibus',        min: 20, fcfa: 250 }, // PK8 ↔ Bassa
  { from: 26, to: 17, transport: 'taxi_collectif', min: 15, fcfa: 200 }, // Yassa ↔ Kotto

  // Bonamoussadi ↔ voisins
  { from: 21, to: 27, transport: 'moto_taxi',      min: 6,  fcfa: 150 }, // Bonamoussadi ↔ Cité des Palmiers

  // Bépanda ↔ voisins
  { from: 22, to: 28, transport: 'taxi_collectif', min: 10, fcfa: 200 }, // Bépanda ↔ Rond-Point Deido

  // Ange Raphaël ↔ voisins
  { from: 23, to: 25, transport: 'taxi_collectif', min: 6,  fcfa: 200 }, // Ange Raphaël ↔ New Bell

  // Denver ↔ voisins
  { from: 24, to: 28, transport: 'moto_taxi',      min: 4,  fcfa: 100 }, // Denver ↔ Rond-Point Deido
  { from: 24, to: 5,  transport: 'taxi_collectif', min: 8,  fcfa: 200 }, // Denver ↔ Deido

  // New Bell ↔ voisins
  { from: 25, to: 14, transport: 'moto_taxi',      min: 5,  fcfa: 100 }, // New Bell ↔ Gare Centrale

  // Cité des Palmiers ↔ voisins
  { from: 27, to: 22, transport: 'moto_taxi',      min: 7,  fcfa: 150 }, // Cité des Palmiers ↔ Bépanda

  // Rond-Point Deido hub
  { from: 28, to: 4,  transport: 'moto_taxi',      min: 5,  fcfa: 100 }, // Rond-Point Deido ↔ Ndokotti
  { from: 28, to: 12, transport: 'moto_taxi',      min: 5,  fcfa: 100 }, // Rond-Point Deido ↔ Mboppi
];

// ─── Routes Yaoundé ──────────────────────────────────────────────────────────
const _yaounde_routes_base = [
  { from: 36, to: 29, transport: 'taxi_collectif', min: 8,  fcfa: 200 }, // Centre ↔ Mvog-Ada
  { from: 36, to: 30, transport: 'taxi_collectif', min: 10, fcfa: 200 }, // Centre ↔ Nlongkak
  { from: 36, to: 33, transport: 'moto_taxi',      min: 5,  fcfa: 150 }, // Centre ↔ Mokolo
  { from: 36, to: 35, transport: 'moto_taxi',      min: 6,  fcfa: 150 }, // Centre ↔ Gare
  { from: 36, to: 42, transport: 'moto_taxi',      min: 4,  fcfa: 100 }, // Centre ↔ Mfoundi
  { from: 36, to: 41, transport: 'taxi_collectif', min: 8,  fcfa: 200 }, // Centre ↔ Brasseries
  { from: 29, to: 40, transport: 'taxi_collectif', min: 12, fcfa: 200 }, // Mvog-Ada ↔ Nkol Eton
  { from: 29, to: 32, transport: 'taxi_collectif', min: 15, fcfa: 200 }, // Mvog-Ada ↔ Mvan
  { from: 29, to: 35, transport: 'moto_taxi',      min: 5,  fcfa: 100 }, // Mvog-Ada ↔ Gare
  { from: 30, to: 31, transport: 'taxi_collectif', min: 12, fcfa: 200 }, // Nlongkak ↔ Bastos
  { from: 30, to: 38, transport: 'taxi_collectif', min: 10, fcfa: 200 }, // Nlongkak ↔ Messa
  { from: 30, to: 33, transport: 'moto_taxi',      min: 6,  fcfa: 150 }, // Nlongkak ↔ Mokolo
  { from: 31, to: 38, transport: 'moto_taxi',      min: 8,  fcfa: 150 }, // Bastos ↔ Messa
  { from: 31, to: 34, transport: 'taxi_collectif', min: 20, fcfa: 250 }, // Bastos ↔ Université
  { from: 32, to: 37, transport: 'taxi_collectif', min: 12, fcfa: 200 }, // Mvan ↔ Biyem-Assi
  { from: 33, to: 38, transport: 'taxi_collectif', min: 8,  fcfa: 200 }, // Mokolo ↔ Messa
  { from: 34, to: 37, transport: 'moto_taxi',      min: 8,  fcfa: 150 }, // Université ↔ Biyem-Assi
  { from: 34, to: 38, transport: 'taxi_collectif', min: 15, fcfa: 200 }, // Université ↔ Messa
  { from: 35, to: 42, transport: 'moto_taxi',      min: 4,  fcfa: 100 }, // Gare ↔ Mfoundi
  { from: 37, to: 32, transport: 'taxi_collectif', min: 12, fcfa: 200 }, // Biyem-Assi ↔ Mvan
  { from: 39, to: 41, transport: 'taxi_collectif', min: 10, fcfa: 200 }, // Essos ↔ Brasseries
  { from: 39, to: 40, transport: 'taxi_collectif', min: 12, fcfa: 200 }, // Essos ↔ Nkol Eton
  { from: 40, to: 42, transport: 'moto_taxi',      min: 8,  fcfa: 150 }, // Nkol Eton ↔ Mfoundi
  { from: 41, to: 36, transport: 'taxi_collectif', min: 8,  fcfa: 200 }, // Brasseries ↔ Centre
  { from: 42, to: 29, transport: 'moto_taxi',      min: 6,  fcfa: 100 }, // Mfoundi ↔ Mvog-Ada
];

// ── Expand bidirectional ─────────────────────────────────────────────────────
function expandBidi(routes, offset = 0) {
  const result = [];
  let id = offset + 1;
  for (const r of routes) {
    result.push({ id: id++, from_point_id: r.from, to_point_id: r.to,
      transport: r.transport, duration_min: r.min, price_fcfa: r.fcfa, is_bidirectional: true });
    // Route inverse (même transport, légèrement plus long en sens inverse)
    result.push({ id: id++, from_point_id: r.to, to_point_id: r.from,
      transport: r.transport, duration_min: Math.ceil(r.min * 1.1), price_fcfa: r.fcfa, is_bidirectional: true });
  }
  return result;
}

export const STATIC_ROUTES = {
  douala:  expandBidi(_douala_routes_base,  0),
  yaounde: expandBidi(_yaounde_routes_base, 200),
};

// Repères et temps de route OpenStreetMap, générés par nawiyapp-backend/scripts/enrich-graph.js
export function buildGraph(city) {
  const enr   = ENRICHMENT.cities?.[city] || {};
  const nodes = (STATIC_FOCAL_POINTS[city] || []).map(n => ({ ...n, landmarks: enr.nodes?.[n.id]?.landmarks || [] }));
  const edges = (STATIC_ROUTES[city] || []).map(e => ({ ...e, ...enr.edges?.[`${e.from_point_id}>${e.to_point_id}`] }));
  return { nodes, edges };
}
