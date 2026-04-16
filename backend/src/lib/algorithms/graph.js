import { AIRPORTS } from '../data/airports.js';
import { PRICE_MAP, TIME_MAP } from '../data/price-matrix.js';

/**
 * Construye el grafo de aeropuertos como lista de adyacencia.
 * Cada arista tiene peso de costo (USD) y de tiempo (horas).
 */
export function buildGraph(criterion = 'cost', cls = 'economy') {
  // adjacency: { 'ATL': [{ to: 'LAX', weight: 400, time: 5 }, ...], ... }
  const graph = {};
  for (const airport of AIRPORTS) {
    graph[airport.code] = [];
  }

  for (const [key, prices] of Object.entries(PRICE_MAP)) {
    const [origin, dest] = key.split('-');
    const price = cls === 'first' ? prices.first : prices.economy;
    if (price === null) continue; // no hay ruta directa

    const time = TIME_MAP[key];
    const weight = criterion === 'time' ? time : price;

    graph[origin].push({ to: dest, weight, cost: price, time });
  }

  return graph;
}
