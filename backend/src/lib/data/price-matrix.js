// Matriz de precios - null = no hay vuelo directo
// Indices: ATL, PEK, DXB, TYO, LON, LAX, PAR, FRA, IST, SIN, MAD, AMS, DFW, CAN, SAO
const CODES = ['ATL','PEK','DXB','TYO','LON','LAX','PAR','FRA','IST','SIN','MAD','AMS','DFW','CAN','SAO'];

const ECONOMY_RAW = [
//      ATL   PEK   DXB   TYO   LON   LAX   PAR   FRA   IST   SIN   MAD   AMS   DFW   CAN   SAO
  [       0,  null, null, 1400, null,  400, null,  800, null, 1500,  800, null,  200, null,  900], // ATL
  [    null,     0,  700,  500,  900, null,  950, null, null,  600,  950,  900, 1150, null, 1700], // PEK
  [    null,   700,    0,  750,  650, 1300,  700,  600,  400,  600, null,  650, 1200, null, 1400], // DXB
  [    1400,   500,  750,    0, 1000,  900,  105, null,  900,  700, 1100, null, 1350, null, null], // TYO
  [     700,  null,  650, 1000,    0,  800,  150, null,  400, null,  200,  150, null, null, 1100], // LON
  [     400,  1100, 1300,  900, null,    0,  850,  900, 1100, 1400, null,  850,  300, null, null], // LAX
  [     750,  null,  700, null, null,  850,    0, 7000, null,  950,  200,  180, null, null, 1050], // PAR
  [    null,   850, null,  950,  200,  900,  150,    0,  350,  900, null, null,  850, null, null], // FRA
  [    null,   800,  400,  900, null, 2999, null,  350,    0,  800,  500,  450, 1000, null, 1200], // IST
  [    null,   600, null,  700,  900, null,  950, null,  800,    0, 1000, null, 1400, null, null], // SIN
  [    null,  null,  750, null, null,  900,  200,  250,  500, 1000,    0,  200,  850, null, 1000], // MAD
  [     780,   900,  650, 1000,  150,  850, null, null,  450,  950,  200,    0,  800, null, 1050], // AMS
  [     200,  null, 1200, null, null,  300,  800, null, 1000, null,  850,  800,    0, 1200,  950], // DFW
  [    null,   200,  650,  550,  950, 1150,  950, null,  800,  500, null,  900, 1200,    0, 1700], // CAN
  [     900,  null, null, null, null, null, null, null, null, null, null, null,  950, null,    0], // SAO
];

const FIRST_RAW = [
//      ATL    PEK    DXB    TYO    LON    LAX    PAR    FRA    IST    SIN    MAD    AMS    DFW    CAN    SAO
  [       0,  null,  null,  1890,  null,   540,  null,  1080,  null,  2025,  1080,  null,   270,  null,  1215], // ATL
  [    null,     0,   945,   675,  1215,  null,  1283,  null,  null,   810,  1283,  1215,  1553,  null,  2295], // PEK
  [    null,   945,     0,  1013,   878,  1755,   945,   810,   540,   810,  null,   878,  1620,  null,  1890], // DXB
  [    1890,   675,  1013,     0,  1350,  1215,   142,  null,  1215,   945,  1485,  null,  1823,  null,  null], // TYO
  [     945,  null,   878,  1350,     0,  1080,   203,  null,   540,  null,   270,   203,  null,  null,  1485], // LON
  [     540,  1485,  1755,  1215,  null,     0,  1148,  1215,  1485,  1890,  null,  1148,   405,  null,  null], // LAX
  [    1013,  null,   945,  null,  null,  1148,     0,  9450,  null,  1283,   270,   243,  null,  null,  1418], // PAR
  [    null,  1148,  null,  1283,   270,  1215,   203,     0,   473,  1215,  null,  null,  1148,  null,  null], // FRA
  [    null,  1080,   540,  1215,  null,  4049,  null,   473,     0,  1080,   675,   608,  1350,  null,  1620], // IST
  [    null,   810,  null,   945,  1215,  null,  1283,  null,  1080,     0,  1350,  null,  1890,  null,  null], // SIN
  [    null,  null,  1013,  null,  null,  1215,   270,   338,   675,  1350,     0,   270,  1148,  null,  1350], // MAD
  [    1053,  1215,   878,  1350,   203,  1148,  null,  null,   608,  1283,   270,     0,  1080,  null,  1418], // AMS
  [     270,  null,  1620,  null,  null,   405,  1080,  null,  1350,  null,  1148,  1080,     0,  1620,  1283], // DFW
  [    null,   270,   878,   743,  1283,  1553,  1283,  null,  1080,   675,  null,  1215,  1620,     0,  2295], // CAN
  [    1215,  null,  null,  null,  null,  null,  null,  null,  null,  null,  null,  null,  1283,  null,     0], // SAO
];

const TIME_RAW = [
//   ATL  PEK  DXB  TYO  LON  LAX  PAR  FRA  IST  SIN  MAD  AMS  DFW  CAN  SAO
  [    0,  15,  14,  16,   8,   5,   9,  10,  12,  18,   8,   9,   2,  16,   9], // ATL
  [   15,   0,   8,   3,  10,  12,  11,  10,   9,   6,  12,  10,  15,   3,  22], // PEK
  [   14,   8,   0,  10,   7,  16,   7,   7,   4,   7,   8,   7,  15,   8,  15], // DXB
  [   16,   3,  10,   0,  12,  11,  13,  12,  11,   7,  14,  12,  13,   4,  24], // TYO
  [    8,  10,   7,  12,   0,  11,   1,   1,   4,  13,   2,   1,  10,  11,  12], // LON
  [    5,  12,  16,  11,  11,   0,  11,  11,  13,  17,  11,  11,   3,  14,  12], // LAX
  [    9,  11,   7,  13,   1,  11,   0,   1,   3,  13,   2,   1,  10,  10,  12], // PAR
  [    9,  10,   7,  12,   1,  11,   1,   0,   3,  12,   2,   1,  10,  10,  12], // FRA
  [   11,   9,   4,  11,   4,  13,   3,   3,   0,  10,   4,   3,  12,   9,  13], // IST
  [   18,   6,   7,   7,  13,  17,  13,  12,  10,   0,  14,  13,  17,   4,  25], // SIN
  [    8,  12,   8,  14,   2,  11,   2,   2,   4,  14,   0,   2,  10,  12,  10], // MAD
  [    9,  10,   7,  12,   1,  11,   1,   1,   3,  13,   2,   0,  10,  12,  10], // AMS
  [    2,  14,  15,  13,  10,   3,  10,  10,  12,  17,  10,  10,   0,  15,  10], // DFW
  [   16,   3,   8,   4,  11,  14,  11,  10,   9,   4,  12,  10,  15,   0,  23], // CAN
  [    9,  22,  15,  24,  12,  12,  12,  12,  13,  25,  10,  12,  10,  23,   0], // SAO
];

// Construir mapa de precios: { 'ATL-PEK': { economy: 1200, first: 1620 } }
export const PRICE_MAP = {};
export const TIME_MAP = {};

for (let i = 0; i < CODES.length; i++) {
  for (let j = 0; j < CODES.length; j++) {
    if (i !== j) {
      const key = `${CODES[i]}-${CODES[j]}`;
      PRICE_MAP[key] = {
        economy: ECONOMY_RAW[i][j],
        first: FIRST_RAW[i][j],
      };
      TIME_MAP[key] = TIME_RAW[i][j];
    }
  }
}

export { CODES };

export function getPrice(origin, dest, cls = 'economy') {
  const key = `${origin}-${dest}`;
  return PRICE_MAP[key]?.[cls] ?? null;
}

export function getFlightTime(origin, dest) {
  return TIME_MAP[`${origin}-${dest}`] ?? null;
}

// Lista de rutas directas (donde hay precio definido en ambas clases)
export function getDirectRoutes() {
  const routes = [];
  for (const [key, val] of Object.entries(PRICE_MAP)) {
    if (val.economy !== null || val.first !== null) {
      const [origin, dest] = key.split('-');
      routes.push({ origin, dest, economy: val.economy, first: val.first });
    }
  }
  return routes;
}
