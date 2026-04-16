/**
 * Datos de rutas estáticos para el mapa interactivo.
 * Espejo del backend — solo precios de economía para determinar conectividad.
 */

export const CODES = ['ATL','PEK','DXB','TYO','LON','LAX','PAR','FRA','IST','SIN','MAD','AMS','DFW','CAN','SAO'];

// null = sin vuelo directo entre ese par
const ECON = [
//   ATL   PEK   DXB   TYO   LON   LAX   PAR   FRA   IST   SIN   MAD   AMS   DFW   CAN   SAO
  [    0, null, null, 1400, null,  400, null,  800, null, 1500,  800, null,  200, null,  900], // ATL
  [ null,    0,  700,  500,  900, null,  950, null, null,  600,  950,  900, 1150, null, 1700], // PEK
  [ null,  700,    0,  750,  650, 1300,  700,  600,  400,  600, null,  650, 1200, null, 1400], // DXB
  [ 1400,  500,  750,    0, 1000,  900,  105, null,  900,  700, 1100, null, 1350, null, null], // TYO
  [  700, null,  650, 1000,    0,  800,  150, null,  400, null,  200,  150, null, null, 1100], // LON
  [  400, 1100, 1300,  900, null,    0,  850,  900, 1100, 1400, null,  850,  300, null, null], // LAX
  [  750, null,  700, null, null,  850,    0, 7000, null,  950,  200,  180, null, null, 1050], // PAR
  [ null,  850, null,  950,  200,  900,  150,    0,  350,  900, null, null,  850, null, null], // FRA
  [ null,  800,  400,  900, null, 2999, null,  350,    0,  800,  500,  450, 1000, null, 1200], // IST
  [ null,  600, null,  700,  900, null,  950, null,  800,    0, 1000, null, 1400, null, null], // SIN
  [ null, null,  750, null, null,  900,  200,  250,  500, 1000,    0,  200,  850, null, 1000], // MAD
  [  780,  900,  650, 1000,  150,  850, null, null,  450,  950,  200,    0,  800, null, 1050], // AMS
  [  200, null, 1200, null, null,  300,  800, null, 1000, null,  850,  800,    0, 1200,  950], // DFW
  [ null,  200,  650,  550,  950, 1150,  950, null,  800,  500, null,  900, 1200,    0, 1700], // CAN
  [  900, null, null, null, null, null, null, null, null, null, null, null,  950, null,    0], // SAO
];

/** ¿Hay vuelo directo entre A y B (en cualquier dirección)? */
export function isDirect(a, b) {
  const i = CODES.indexOf(a), j = CODES.indexOf(b);
  if (i < 0 || j < 0) return false;
  return ECON[i][j] !== null || ECON[j][i] !== null;
}

/** Todos los pares únicos con ruta directa */
export const DIRECT_PAIRS = [];
for (let i = 0; i < CODES.length; i++) {
  for (let j = i + 1; j < CODES.length; j++) {
    if (ECON[i][j] !== null || ECON[j][i] !== null) {
      DIRECT_PAIRS.push([CODES[i], CODES[j]]);
    }
  }
}

/** Mini-Dijkstra para encontrar la ruta con escala (solo 15 nodos → instantáneo) */
export function findPath(from, to) {
  if (from === to) return [from];
  // Construir adyacencia bidireccional
  const adj = {};
  for (const c of CODES) adj[c] = [];
  for (let i = 0; i < CODES.length; i++) {
    for (let j = 0; j < CODES.length; j++) {
      if (i !== j) {
        const w = ECON[i][j] ?? ECON[j][i];
        if (w !== null && w !== undefined) {
          adj[CODES[i]].push({ to: CODES[j], w });
        }
      }
    }
  }

  const dist = {}, prev = {};
  for (const c of CODES) { dist[c] = Infinity; prev[c] = null; }
  dist[from] = 0;
  const unvisited = new Set(CODES);

  while (unvisited.size > 0) {
    let u = null;
    for (const c of unvisited) {
      if (u === null || dist[c] < dist[u]) u = c;
    }
    if (u === to || dist[u] === Infinity) break;
    unvisited.delete(u);
    for (const e of adj[u]) {
      const alt = dist[u] + e.w;
      if (alt < dist[e.to]) { dist[e.to] = alt; prev[e.to] = u; }
    }
  }

  const path = [];
  let cur = to;
  while (cur) { path.unshift(cur); cur = prev[cur]; }
  return path[0] === from ? path : null;
}
