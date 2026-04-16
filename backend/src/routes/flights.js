import { Router } from 'express';
import { getMongoDb } from '../lib/db/mongodb.js';
import { queryEuropa, queryAsia, sql } from '../lib/db/sqlserver.js';
import { AIRPORTS } from '../lib/data/airports.js';

const router = Router();

// Mapa código → nodo asignado
const AIRPORT_NODE = Object.fromEntries(AIRPORTS.map(a => [a.code, a.assigned_node]));

// Determina qué nodos hay que consultar según el origen/destino pedido
function resolveNodesToQuery(origin, destination) {
  // Si se especifica origen, solo el nodo de ese aeropuerto
  if (origin) {
    const n = AIRPORT_NODE[origin.toUpperCase()];
    if (n) return [n];
  }
  // Si se especifica destino sin origen, solo el nodo de ese aeropuerto
  if (destination) {
    const n = AIRPORT_NODE[destination.toUpperCase()];
    if (n) return [n];
  }
  return [1, 2, 3]; // sin filtro → los 3
}

// GET /api/flights  — busca en los nodos relevantes
router.get('/', async (req, res) => {
  const { origin, destination, date, limit = '50', page = '1', node, class: userCls } = req.query;
  const cls = userCls || 'ECONOMY';
  const lim     = Math.min(parseInt(limit) || 50, 500);
  const pageNum = Math.max(parseInt(page) || 1, 1);
  const skip    = (pageNum - 1) * lim;

  // Si se pide un nodo explícito (filtro región en el frontend), úsalo
  let nodesToQuery = node ? [parseInt(node)] : resolveNodesToQuery(origin, destination);

  try {
    const perNode = lim; // pedimos el límite completo por nodo para no perder resultados

    const tasks = [];
    if (nodesToQuery.includes(1)) tasks.push({ key: 1, p: queryMongo({ origin, dest: destination, date, skip, limit: perNode, cls }) });
    if (nodesToQuery.includes(2)) tasks.push({ key: 2, p: querySqlFlights('europa', { origin, dest: destination, date, limit: perNode, cls }) });
    if (nodesToQuery.includes(3)) tasks.push({ key: 3, p: querySqlFlights('asia',   { origin, dest: destination, date, limit: perNode, cls }) });

    const settled = await Promise.allSettled(tasks.map(t => t.p));

    const flights = [];
    const nodeErrors = [];
    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      if (r.status === 'fulfilled') {
        flights.push(...r.value);
      } else {
        nodeErrors.push(`Nodo ${tasks[i].key}: ${r.reason?.message?.slice(0, 60) || 'error'}`);
      }
    }
    flights.sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));

    res.json({
      data:     flights.slice(skip, skip + lim),
      page:     pageNum,
      total:    flights.length,
      nodes_queried: nodesToQuery,
      ...(nodeErrors.length ? { warnings: nodeErrors } : {}),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/flights/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const flight = await findFlightById(id);
    if (!flight) return res.status(404).json({ error: 'Vuelo no encontrado' });
    const seats = await findSeatsByFlight(id, flight.node);
    res.json({ flight, seats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ──────────────────────────────────────────────────
async function queryMongo({ origin, dest, date, skip, limit, cls }) {
  const db = await getMongoDb();
  const filter = {};
  if (origin) filter.origin      = origin.toUpperCase();
  if (dest)   filter.destination = dest.toUpperCase();
  if (date) {
    const d = new Date(date);
    filter.departure_time = { $gte: d };
  }
  const flights = await db.collection('flights').aggregate([
    { $match: filter },
    { $sort: { departure_time: 1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'price_matrix',
        let: { o: '$origin', d: '$destination', c: cls || 'ECONOMY' },
        pipeline: [
          { $match: { $expr: { $and: [ { $eq: ['$origin', '$$o'] }, { $eq: ['$destination', '$$d'] }, { $eq: ['$class', '$$c'] } ] } } }
        ],
        as: 'price_info'
      }
    },
    { $addFields: { price: { $arrayElemAt: ['$price_info.price_usd', 0] } } },
    { $project: { price_info: 0 } }
  ]).toArray();
  return flights.map(f => ({ ...f, node: 1, _id: undefined }));
}

async function querySqlFlights(nodeKey, { origin, dest, date, limit, cls }) {
  const query = nodeKey === 'europa' ? queryEuropa : queryAsia;
  let where = 'WHERE 1=1';
  const inputs = {};

  if (origin) { where += ' AND f.origin = @origin';      inputs.origin = { type: sql.VarChar, value: origin.toUpperCase() }; }
  if (dest)   { where += ' AND f.destination = @dest';   inputs.dest   = { type: sql.VarChar, value: dest.toUpperCase() }; }
  if (date)   { where += ' AND CAST(f.departure_time AS DATE) >= @date'; inputs.date = { type: sql.VarChar, value: date }; }
  inputs.cls = { type: sql.VarChar, value: cls || 'ECONOMY' };

  const result = await query(
    `SELECT TOP ${limit} f.*, pm.price_usd as price 
     FROM Flights f
     LEFT JOIN PriceMatrix pm ON f.origin = pm.origin AND f.destination = pm.destination AND pm.class = @cls
     ${where} ORDER BY f.departure_time`, inputs
  );
  return (result.recordset || []).map(f => ({ ...f, node: nodeKey === 'europa' ? 2 : 3 }));
}

async function findFlightById(id) {
  const [m, e, a] = await Promise.allSettled([
    (async () => { const db = await getMongoDb(); return db.collection('flights').findOne({ id }); })(),
    queryEuropa('SELECT * FROM Flights WHERE id = @id', { id: { type: sql.Int, value: id } }),
    queryAsia  ('SELECT * FROM Flights WHERE id = @id', { id: { type: sql.Int, value: id } }),
  ]);
  if (m.status === 'fulfilled' && m.value) return { ...m.value, node: 1, _id: undefined };
  if (e.status === 'fulfilled' && e.value?.recordset?.[0]) return { ...e.value.recordset[0], node: 2 };
  if (a.status === 'fulfilled' && a.value?.recordset?.[0]) return { ...a.value.recordset[0], node: 3 };
  return null;
}

async function findSeatsByFlight(flightId, node) {
  if (node === 1) {
    const db = await getMongoDb();
    return db.collection('seats').find({ flight_id: flightId }).sort({ seat_number: 1 }).toArray();
  }
  const q = node === 2 ? queryEuropa : queryAsia;
  const r = await q('SELECT * FROM Seats WHERE flight_id = @fid ORDER BY seat_number',
    { fid: { type: sql.Int, value: flightId } });
  return r.recordset || [];
}

export default router;
