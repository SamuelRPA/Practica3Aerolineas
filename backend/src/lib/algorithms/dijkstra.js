import { buildGraph } from './graph.js';
import { AIRPORTS } from '../data/airports.js';

/**
 * Algoritmo de Dijkstra para rutas mínimas.
 *
 * @param {string} origin    - código aeropuerto origen
 * @param {string} dest      - código aeropuerto destino
 * @param {string} criterion - 'cost' | 'time'
 * @param {string} cls       - 'economy' | 'first'
 * @returns {{ path: string[], totalCost: number, totalTime: number, segments: object[] }}
 */
export function dijkstra(origin, dest, criterion = 'cost', cls = 'economy') {
  const graph = buildGraph(criterion, cls);
  const codes = AIRPORTS.map(a => a.code);

  const dist = {};
  const prev = {};
  const visited = new Set();

  for (const code of codes) {
    dist[code] = Infinity;
    prev[code] = null;
  }
  dist[origin] = 0;

  // Cola de prioridad simple (MinHeap mediante array + sort)
  const queue = [{ node: origin, dist: 0 }];

  while (queue.length > 0) {
    // Extraer nodo con menor distancia
    queue.sort((a, b) => a.dist - b.dist);
    const { node: current } = queue.shift();

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === dest) break;

    for (const edge of (graph[current] || [])) {
      if (visited.has(edge.to)) continue;
      const newDist = dist[current] + edge.weight;
      if (newDist < dist[edge.to]) {
        dist[edge.to] = newDist;
        prev[edge.to] = { from: current, edge };
        queue.push({ node: edge.to, dist: newDist });
      }
    }
  }

  if (dist[dest] === Infinity) {
    return { path: [], totalCost: Infinity, totalTime: Infinity, segments: [], reachable: false };
  }

  // Reconstruir camino
  const path = [];
  let current = dest;
  while (current !== null) {
    path.unshift(current);
    current = prev[current]?.from ?? null;
  }

  // Calcular totales de costo y tiempo por segmento
  const segments = [];
  let totalCost = 0;
  let totalTime = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const edge = graph[from].find(e => e.to === to);
    segments.push({
      from,
      to,
      cost_usd: edge.cost,
      time_hours: edge.time,
    });
    totalCost += edge.cost;
    totalTime += edge.time;
  }

  return {
    path,
    totalCost,
    totalTime,
    segments,
    reachable: true,
    criterion,
    class: cls,
  };
}
