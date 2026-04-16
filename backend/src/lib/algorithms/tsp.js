import { buildGraph } from './graph.js';
import { dijkstra } from './dijkstra.js';

/**
 * TSP con Held-Karp (programación dinámica) O(2^n * n²)
 * Viajero que visita todas las ciudades dadas y regresa al origen.
 *
 * @param {string[]} cities    - array de códigos de aeropuerto a visitar
 * @param {string} criterion   - 'cost' | 'time'
 * @param {string} cls         - 'economy' | 'first'
 * @returns {{ route: string[], totalCost: number, totalTime: number, segments: object[] }}
 */
export function tsp(cities, criterion = 'cost', cls = 'economy') {
  const n = cities.length;
  if (n === 0) return { route: [], totalCost: 0, totalTime: 0, segments: [] };
  if (n === 1) return { route: [cities[0], cities[0]], totalCost: 0, totalTime: 0, segments: [] };

  // Pre-calcular distancias entre todos los pares con Dijkstra
  const dist = {};
  const pathCache = {};
  for (let i = 0; i < n; i++) {
    dist[i] = {};
    pathCache[i] = {};
    for (let j = 0; j < n; j++) {
      if (i === j) {
        dist[i][j] = 0;
        pathCache[i][j] = { segments: [] };
        continue;
      }
      const result = dijkstra(cities[i], cities[j], criterion, cls);
      dist[i][j] = result.reachable
        ? (criterion === 'time' ? result.totalTime : result.totalCost)
        : Infinity;
      pathCache[i][j] = result;
    }
  }

  // Held-Karp DP
  // dp[mask][i] = costo mínimo para visitar ciudades en mask y terminar en i
  // mask es un bitmask de n bits
  const INF = Infinity;
  const dp = Array(1 << n).fill(null).map(() => Array(n).fill(INF));
  const parent = Array(1 << n).fill(null).map(() => Array(n).fill(-1));

  dp[1][0] = 0; // empezar en ciudad 0 (índice 0 = cities[0])

  for (let mask = 1; mask < (1 << n); mask++) {
    if (!(mask & 1)) continue; // siempre incluir ciudad 0
    for (let u = 0; u < n; u++) {
      if (!(mask & (1 << u))) continue;
      if (dp[mask][u] === INF) continue;
      for (let v = 0; v < n; v++) {
        if (mask & (1 << v)) continue; // ya visitada
        const newMask = mask | (1 << v);
        const newCost = dp[mask][u] + dist[u][v];
        if (newCost < dp[newMask][v]) {
          dp[newMask][v] = newCost;
          parent[newMask][v] = u;
        }
      }
    }
  }

  // Encontrar el mejor tour final (volver a ciudad 0)
  const fullMask = (1 << n) - 1;
  let bestCost = INF;
  let lastCity = -1;

  for (let u = 1; u < n; u++) {
    const cost = dp[fullMask][u] + dist[u][0];
    if (cost < bestCost) {
      bestCost = cost;
      lastCity = u;
    }
  }

  if (bestCost === INF) {
    return { route: [], totalCost: INF, totalTime: INF, segments: [], reachable: false };
  }

  // Reconstruir ruta
  const tour = [];
  let mask = fullMask;
  let current = lastCity;
  while (current !== -1) {
    tour.unshift(current);
    const prev = parent[mask][current];
    mask = mask ^ (1 << current);
    current = prev;
  }
  tour.push(0); // regresar al origen

  const routeCodes = tour.map(i => cities[i]);

  // Calcular segmentos completos con escalas
  const allSegments = [];
  let totalCost = 0;
  let totalTime = 0;

  for (let i = 0; i < tour.length - 1; i++) {
    const from = tour[i];
    const to = tour[i + 1];
    const leg = pathCache[from][to];
    if (leg && leg.segments) {
      allSegments.push(...leg.segments);
      totalCost += leg.totalCost || 0;
      totalTime += leg.totalTime || 0;
    }
  }

  return {
    route: routeCodes,
    totalCost,
    totalTime,
    segments: allSegments,
    reachable: true,
    criterion,
    class: cls,
  };
}
