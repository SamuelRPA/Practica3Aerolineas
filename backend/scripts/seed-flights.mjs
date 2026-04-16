/**
 * Carga vuelos del CSV en los 3 nodos distribuidos.
 *
 * Por cada vuelo:
 *  - Verifica si la ruta es DIRECTA (PRICE_MAP) o con ESCALAS (Dijkstra)
 *  - Guarda route_type + connection_via en el registro
 *  - Distribuye al nodo correspondiente según assigned_node del aeropuerto origen
 *  - Genera asientos: 73 % SOLD · 3 % RESERVED · resto AVAILABLE
 *
 * Inserta usando sql.Table (BCP bulk) en SQL Server → muy rápido.
 *
 * Uso: node --env-file=.env scripts/seed-flights.mjs [ruta-csv] [max-vuelos]
 * Ej:  node --env-file=.env scripts/seed-flights.mjs ../vuelos_completos.csv 10000
 */

import 'dotenv/config';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { MongoClient } from 'mongodb';
import sql from 'mssql';

import { AIRPORTS }                       from '../src/lib/data/airports.js';
import { AIRCRAFT_MODELS, generateFleet } from '../src/lib/data/aircraft.js';
import { PRICE_MAP, TIME_MAP }            from '../src/lib/data/price-matrix.js';
import { dijkstra }                       from '../src/lib/algorithms/dijkstra.js';

// ── Config ────────────────────────────────────────────────────────────────────
const CSV_PATH    = process.argv[2] ?? '../vuelos_completos.csv';
const MAX_FLIGHTS = parseInt(process.argv[3] ?? '10000');
const USD_TO_BS   = parseFloat(process.env.USD_TO_BS ?? '6.96');
const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_BATCH = 300;  // flush MongoDB cada N vuelos
const SQL_FLUSH   = 200;  // flush SQL Server cada N vuelos (con todos sus asientos)

const SQL_BASE = {
  options:          { trustServerCertificate: true, enableArithAbort: true },
  requestTimeout:   300000,   // 5 min para bulk inserts
  connectionTimeout: 30000,
};
const SQL_EUROPA_CONFIG = {
  ...SQL_BASE,
  server:   process.env.SQL_EUROPA_HOST     ?? 'localhost',
  port:     parseInt(process.env.SQL_EUROPA_PORT ?? '1433'),
  user:     process.env.SQL_EUROPA_USER     ?? 'sa',
  password: process.env.SQL_EUROPA_PASSWORD ?? 'AerolineasRP_2026!',
};
const SQL_ASIA_CONFIG = {
  ...SQL_BASE,
  server:   process.env.SQL_ASIA_HOST     ?? 'localhost',
  port:     parseInt(process.env.SQL_ASIA_PORT ?? '1434'),
  user:     process.env.SQL_ASIA_USER     ?? 'sa',
  password: process.env.SQL_ASIA_PASSWORD ?? 'AerolineasRP_2026!',
};

// ── Mapas pre-computados ──────────────────────────────────────────────────────
const FLEET       = generateFleet();
const FLEET_MAP   = Object.fromEntries(FLEET.map(f => [f.id, f]));
const MODEL_MAP   = Object.fromEntries(AIRCRAFT_MODELS.map(m => [m.id, m]));
const AIRPORT_MAP = Object.fromEntries(AIRPORTS.map(a => [a.code, a]));

// Cache de rutas: evita correr Dijkstra dos veces para el mismo par (máx 210 pares)
const routeCache = new Map();

// ── Helpers de ruta ───────────────────────────────────────────────────────────
function getRouteInfo(origin, dest) {
  const key = `${origin}-${dest}`;
  if (routeCache.has(key)) return routeCache.get(key);

  const p = PRICE_MAP[key];
  if (p && (p.economy !== null || p.first !== null)) {
    const info = { type: 'DIRECT', via: '' };
    routeCache.set(key, info);
    return info;
  }

  // Sin ruta directa → Dijkstra por costo
  const res = dijkstra(origin, dest, 'cost', 'economy');
  if (!res.reachable) {
    routeCache.set(key, null);
    return null;
  }
  const info = { type: 'CONNECTING', via: res.path.slice(1, -1).join(',') };
  routeCache.set(key, info);
  return info;
}

// ── Helpers de asientos ───────────────────────────────────────────────────────
function randomSeatStatus() {
  const r = Math.random();
  if (r < 0.73) return 'SOLD';
  if (r < 0.76) return 'RESERVED';
  return 'AVAILABLE';
}

function generateSeats(flightId, modelId, startId) {
  const model = MODEL_MAP[modelId];
  const seats = [];
  let sid = startId;

  const firstRows = Math.ceil(model.first_class_seats / 4);
  let fc = 0;
  for (let row = 1; row <= firstRows && fc < model.first_class_seats; row++) {
    for (const col of ['A', 'B', 'C', 'D']) {
      if (fc >= model.first_class_seats) break;
      const p = 540;
      seats.push({ id: sid++, flight_id: flightId, seat_number: `${row}${col}`,
        class: 'FIRST', status: randomSeatStatus(),
        price_usd: p, price_bs: +(p * USD_TO_BS).toFixed(2), lamport_clock: 0 });
      fc++;
    }
  }

  const econStart = firstRows + 1;
  const econRows  = Math.ceil(model.economy_seats / 6);
  let ec = 0;
  for (let row = econStart; row < econStart + econRows && ec < model.economy_seats; row++) {
    for (const col of ['A', 'B', 'C', 'D', 'E', 'F']) {
      if (ec >= model.economy_seats) break;
      const p = 400;
      seats.push({ id: sid++, flight_id: flightId, seat_number: `${row}${col}`,
        class: 'ECONOMY', status: randomSeatStatus(),
        price_usd: p, price_bs: +(p * USD_TO_BS).toFixed(2), lamport_clock: 0 });
      ec++;
    }
  }
  return seats;
}

function parseFlightStatus(depDate) {
  const now  = new Date();
  const diff = (now - depDate) / 3_600_000;
  if (depDate > now) return 'SCHEDULED';
  if (diff < 0.5)   return 'BOARDING';
  if (diff < 1)     return 'DEPARTED';
  if (diff < 14)    return 'IN_FLIGHT';
  if (diff < 15)    return 'LANDED';
  return 'ARRIVED';
}

// ── SQL bulk insert via sql.Table (BCP) ───────────────────────────────────────
async function bulkInsertFlightsSql(pool, flights) {
  if (!flights.length) return;
  const tbl = new sql.Table('Flights');
  tbl.create = false;
  tbl.columns.add('id',                    sql.Int,           { nullable: false });
  tbl.columns.add('flight_number',         sql.VarChar(10),   { nullable: false });
  tbl.columns.add('origin',                sql.VarChar(3),    { nullable: false });
  tbl.columns.add('destination',           sql.VarChar(3),    { nullable: false });
  tbl.columns.add('aircraft_id',           sql.Int,           { nullable: false });
  tbl.columns.add('departure_time',        sql.DateTime,      { nullable: false });
  tbl.columns.add('arrival_time',          sql.DateTime,      { nullable: false });
  tbl.columns.add('flight_duration_hours', sql.Int,           { nullable: false });
  tbl.columns.add('status',                sql.VarChar(20),   { nullable: false });
  tbl.columns.add('lamport_clock',         sql.Int,           { nullable: false });
  tbl.columns.add('vector_clock',          sql.VarChar(50),   { nullable: false });
  tbl.columns.add('processed_by_node',     sql.Int,           { nullable: false });
  tbl.columns.add('route_type',            sql.VarChar(15),   { nullable: false });
  tbl.columns.add('connection_via',        sql.VarChar(200),  { nullable: false });
  tbl.columns.add('gate',                  sql.VarChar(10),   { nullable: false });
  for (const f of flights) {
    tbl.rows.add(
      f.id, f.flight_number, f.origin, f.destination, f.aircraft_id,
      f.departure_time, f.arrival_time, f.flight_duration_hours, f.status,
      0, '[0,0,0]', f.processed_by_node, f.route_type, f.connection_via, f.gate,
    );
  }
  await pool.request().bulk(tbl);
}

async function bulkInsertSeatsSql(pool, seats) {
  if (!seats.length) return;
  const tbl = new sql.Table('Seats');
  tbl.create = false;
  tbl.columns.add('id',            sql.Int,          { nullable: false });
  tbl.columns.add('flight_id',     sql.Int,          { nullable: false });
  tbl.columns.add('seat_number',   sql.VarChar(5),   { nullable: false });
  tbl.columns.add('class',         sql.VarChar(10),  { nullable: false });
  tbl.columns.add('status',        sql.VarChar(15),  { nullable: false });
  tbl.columns.add('price_usd',     sql.Float,        { nullable: false });
  tbl.columns.add('price_bs',      sql.Float,        { nullable: false });
  tbl.columns.add('lamport_clock', sql.Int,          { nullable: false });
  for (const s of seats) {
    tbl.rows.add(s.id, s.flight_id, s.seat_number, s.class, s.status,
                 s.price_usd, s.price_bs, 0);
  }
  await pool.request().bulk(tbl);
}

// ── ID con salto de llave ─────────────────────────────────────────────────────
const nodeCounters = { 1: 0, 2: 0, 3: 0 };
function nextId(node) { return node + nodeCounters[node]++ * 3; }

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`\n[ERROR] CSV no encontrado: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║         SEED FLIGHTS — Aerolíneas RP            ║`);
  console.log(`╚══════════════════════════════════════════════════╝`);
  console.log(`  CSV : ${CSV_PATH}`);
  console.log(`  Máx : ${MAX_FLIGHTS} vuelos\n`);

  const content    = fs.readFileSync(CSV_PATH, 'utf-8');
  const allRecords = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  const records    = allRecords.slice(0, MAX_FLIGHTS);
  console.log(`[1/5] CSV leído → ${allRecords.length} filas totales, usando ${records.length}`);

  // ── Conexiones ──────────────────────────────────────────────
  console.log('[2/5] Conectando a las 3 bases de datos...');
  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db('AerolineasAmerica');
  console.log('  ✓ MongoDB (Nodo 1 — América)');

  let poolEuropa = null;
  let poolAsia   = null;
  try {
    poolEuropa = new sql.ConnectionPool({ ...SQL_EUROPA_CONFIG, database: 'AerolineasEuropa' });
    await poolEuropa.connect();
    console.log('  ✓ SQL Server Europa (Nodo 2)');
  } catch (e) {
    console.warn(`  ⚠ SQL Europa no disponible (${e.message.slice(0, 50)}) — omitiendo nodo 2`);
  }
  try {
    poolAsia = new sql.ConnectionPool({ ...SQL_ASIA_CONFIG, database: 'AerolineasAsia' });
    await poolAsia.connect();
    console.log('  ✓ SQL Server Asia (Nodo 3)');
  } catch (e) {
    console.warn(`  ⚠ SQL Asia no disponible (${e.message.slice(0, 50)}) — omitiendo nodo 3`);
  }

  // ── Limpiar ─────────────────────────────────────────────────
  console.log('[3/5] Limpiando datos anteriores en los 3 nodos...');
  await db.collection('bookings').deleteMany({});
  await db.collection('seat_locks').deleteMany({});
  await db.collection('seats').deleteMany({});
  await db.collection('flights').deleteMany({});
  if (poolEuropa) await poolEuropa.request().query('DELETE FROM Bookings; DELETE FROM Seats; DELETE FROM Flights');
  if (poolAsia)   await poolAsia.request().query('DELETE FROM Bookings; DELETE FROM Seats; DELETE FROM Flights');
  console.log('  ✓ Limpieza completa');

  // ── Procesar vuelos ─────────────────────────────────────────
  console.log('[4/5] Procesando vuelos (direct/escala) e insertando en lotes...\n');

  const stats      = { inserted: 0, skipped: 0, direct: 0, connecting: 0, noRoute: 0 };
  const nodeCount  = { 1: 0, 2: 0, 3: 0 };
  let globalSeatId = 1;

  // Buffers por nodo
  const buf = {
    mongo:  { flights: [], seats: [] },
    europa: { flights: [], seats: [] },
    asia:   { flights: [], seats: [] },
  };

  async function flushMongo() {
    if (!buf.mongo.flights.length) return;
    await db.collection('flights').insertMany(buf.mongo.flights);
    await db.collection('seats').insertMany(buf.mongo.seats);
    buf.mongo.flights = [];
    buf.mongo.seats   = [];
  }

  async function flushEuropa() {
    if (!poolEuropa || !buf.europa.flights.length) return;
    await bulkInsertFlightsSql(poolEuropa, buf.europa.flights);
    await bulkInsertSeatsSql(poolEuropa, buf.europa.seats);
    buf.europa.flights = [];
    buf.europa.seats   = [];
  }

  async function flushAsia() {
    if (!poolAsia || !buf.asia.flights.length) return;
    await bulkInsertFlightsSql(poolAsia, buf.asia.flights);
    await bulkInsertSeatsSql(poolAsia, buf.asia.seats);
    buf.asia.flights = [];
    buf.asia.seats   = [];
  }

  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    const origin = r.Origen?.toUpperCase().trim();
    const dest   = r.Destino?.toUpperCase().trim();

    if (!origin || !dest || !AIRPORT_MAP[origin] || !AIRPORT_MAP[dest] || origin === dest) {
      stats.skipped++;
      continue;
    }

    const routeInfo = getRouteInfo(origin, dest);
    if (!routeInfo) { stats.skipped++; stats.noRoute++; continue; }

    if (routeInfo.type === 'DIRECT') stats.direct++;
    else                              stats.connecting++;

    const node     = AIRPORT_MAP[origin].assigned_node;
    const flightId = nextId(node);

    const [yr, mo, dy] = (r.Fecha ?? '2026-01-01').split('-').map(Number);
    const [hh, mm]     = (r.Hora  ?? '00:00').split(':').map(Number);
    const depDate      = new Date(yr, mo - 1, dy, hh, mm, 0);
    if (isNaN(depDate.getTime())) { stats.skipped++; continue; }

    const durationH = TIME_MAP[`${origin}-${dest}`] ?? 8;
    const arrDate   = new Date(depDate.getTime() + durationH * 3_600_000);

    const aircraftId = ((flightId - 1) % FLEET.length) + 1;
    const aircraft   = FLEET_MAP[aircraftId];

    const flight = {
      id:                    flightId,
      flight_number:         `RP${String(parseInt(r.VueloID) || flightId).padStart(4, '0')}`,
      origin,
      destination:           dest,
      aircraft_id:           aircraftId,
      departure_time:        depDate,
      arrival_time:          arrDate,
      flight_duration_hours: durationH,
      status:                parseFlightStatus(depDate),
      lamport_clock:         0,
      vector_clock:          '[0,0,0]',
      processed_by_node:     node,
      route_type:            routeInfo.type,
      connection_via:        routeInfo.via,
      gate:                  r.Gate ?? '',
    };

    const seats = generateSeats(flightId, aircraft.aircraft_model_id, globalSeatId);
    globalSeatId += seats.length;

    if (node === 1) {
      buf.mongo.flights.push(flight);
      buf.mongo.seats.push(...seats);
      if (buf.mongo.flights.length >= MONGO_BATCH) await flushMongo();
      stats.inserted++;
      nodeCount[node]++;
    } else if (node === 2 && poolEuropa) {
      buf.europa.flights.push(flight);
      buf.europa.seats.push(...seats);
      if (buf.europa.flights.length >= SQL_FLUSH) await flushEuropa();
      stats.inserted++;
      nodeCount[node]++;
    } else if (node === 3 && poolAsia) {
      buf.asia.flights.push(flight);
      buf.asia.seats.push(...seats);
      if (buf.asia.flights.length >= SQL_FLUSH) await flushAsia();
      stats.inserted++;
      nodeCount[node]++;
    } else if (node !== 1) {
      stats.skipped++; // nodo SQL no disponible
    }

    if (stats.inserted % 500 === 0) {
      const pct = ((i + 1) / records.length * 100).toFixed(1);
      console.log(`  → ${stats.inserted} insertados · ${stats.skipped} omitidos · ${pct}%`);
    }
  }

  // Flush final
  console.log('\n  Guardando lotes finales...');
  await flushMongo();
  await flushEuropa();
  await flushAsia();

  // ── Resumen ─────────────────────────────────────────────────
  const totalSeats = globalSeatId - 1;
  console.log(`\n[5/5] ✓ COMPLETADO`);
  console.log(`\n  ┌──────────────────────────────────────────┐`);
  console.log(`  │  Vuelos insertados  : ${String(stats.inserted).padStart(7)}             │`);
  console.log(`  │  Omitidos          : ${String(stats.skipped).padStart(7)}             │`);
  console.log(`  │  Asientos totales  : ${String(totalSeats).padStart(7)}             │`);
  console.log(`  ├──────────────────────────────────────────┤`);
  console.log(`  │  Rutas DIRECTAS    : ${String(stats.direct).padStart(7)}             │`);
  console.log(`  │  Rutas con ESCALA  : ${String(stats.connecting).padStart(7)}             │`);
  console.log(`  │  Sin ruta posible  : ${String(stats.noRoute).padStart(7)}             │`);
  console.log(`  ├──────────────────────────────────────────┤`);
  console.log(`  │  Nodo 1 – América  : ${String(nodeCount[1]).padStart(7)}             │`);
  console.log(`  │  Nodo 2 – Europa   : ${String(nodeCount[2]).padStart(7)}             │`);
  console.log(`  │  Nodo 3 – Asia     : ${String(nodeCount[3]).padStart(7)}             │`);
  console.log(`  └──────────────────────────────────────────┘\n`);

  await mongoClient.close();
  await poolEuropa.close();
  await poolAsia.close();
  process.exit(0);
}

main().catch(err => {
  console.error('\n[ERROR FATAL]', err.message);
  console.error(err.stack);
  process.exit(1);
});
