/**
 * Algorithme de Dijkstra pour NawiyApp
 * Calcule le chemin optimal entre deux points focaux
 *
 * options.boardingCost(edge) : pénalité ajoutée à chaque montée dans un véhicule
 * (attente + effort du changement), pour éviter les trajets à 4 changements qui
 * font gagner 2 minutes. N'entre pas dans total_duration_min.
 */
export function findPath(graph, startId, endId, weightBy = 'duration_min', { boardingCost } = {}) {
  if (!graph || !graph.nodes || !graph.edges) {
    return { found: false, error: 'GRAPH_NOT_LOADED' };
  }

  const nodes = graph.nodes;
  const edges = graph.edges;

  // Vérifie l'existence des noeuds
  const startNode = nodes.find(n => n.id === startId);
  const endNode   = nodes.find(n => n.id === endId);
  if (!startNode) return { found: false, error: 'START_NOT_FOUND' };
  if (!endNode)   return { found: false, error: 'END_NOT_FOUND' };
  if (startId === endId) return { found: false, error: 'SAME_POINT' };

  // Construit la liste d'adjacence
  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });
  edges.forEach(e => {
    const w = (e[weightBy] || e.duration_min) + (boardingCost ? boardingCost(e) : 0);
    adj[e.from_point_id]?.push({ to: e.to_point_id, weight: w, edge: e });
    if (e.is_bidirectional) {
      adj[e.to_point_id]?.push({ to: e.from_point_id, weight: w, edge: { ...e, from_point_id: e.to_point_id, to_point_id: e.from_point_id } });
    }
  });

  // Dijkstra
  const dist  = {};
  const prev  = {};
  const visited = new Set();
  nodes.forEach(n => { dist[n.id] = Infinity; });
  dist[startId] = 0;

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  while (true) {
    // Noeud non visité avec distance minimale
    let u = null;
    nodes.forEach(n => {
      if (!visited.has(n.id) && (u === null || dist[n.id] < dist[u])) u = n.id;
    });
    if (u === null || dist[u] === Infinity) break;
    if (u === endId) break;
    visited.add(u);

    (adj[u] || []).forEach(({ to, weight, edge }) => {
      const alt = dist[u] + weight;
      if (alt < dist[to]) {
        dist[to] = alt;
        prev[to] = { from: u, edge };
      }
    });
  }

  if (dist[endId] === Infinity) return { found: false, error: 'NO_PATH' };

  // Reconstruit le chemin
  const path = [];
  let current = endId;
  while (prev[current]) {
    const { from, edge } = prev[current];
    path.unshift({
      from:         nodeMap[from],
      to:           nodeMap[current],
      transport:    edge.transport,
      duration_min: edge.duration_min,
      price_fcfa:   edge.price_fcfa,
    });
    current = from;
  }

  return {
    found: true,
    path,
    total_duration_min: path.reduce((sum, s) => sum + s.duration_min, 0),
    total_price_fcfa:   path.reduce((sum, s) => sum + s.price_fcfa, 0),
  };
}
