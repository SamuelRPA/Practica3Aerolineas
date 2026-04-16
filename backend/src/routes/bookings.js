import { Router } from 'express';
import { getMongoDb } from '../lib/db/mongodb.js';
import { queryEuropa, queryAsia, getEuropaPool, getAsiaPool, sql } from '../lib/db/sqlserver.js';
import { propagateToOtherNodes } from '../lib/db/sync.js';
import { lamportTick } from '../lib/clocks/lamport.js';
import { vectorTick, serializeVector } from '../lib/clocks/vector.js';
import { AIRPORTS } from '../lib/data/airports.js';

const router = Router();
const USD_TO_BS  = parseFloat(process.env.USD_TO_BS || '6.96');
const AIRPORT_MAP = Object.fromEntries(AIRPORTS.map(a => [a.code, a]));

// ── Helpers multi-nodo ──────────────────────────────────────

/** Encuentra vuelo + nodo de origen en los 3 DBs */
async function findFlightAnyNode(flightId) {
  const db = await getMongoDb();
  const mf = await db.collection('flights').findOne({ id: flightId });
  if (mf) return { flight: mf, node: 1 };

  try {
    const er = await queryEuropa('SELECT * FROM Flights WHERE id = @id',
      { id: { type: sql.Int, value: flightId } });
    if (er.recordset?.[0]) return { flight: er.recordset[0], node: 2 };
  } catch (_) {}

  try {
    const ar = await queryAsia('SELECT * FROM Flights WHERE id = @id',
      { id: { type: sql.Int, value: flightId } });
    if (ar.recordset?.[0]) return { flight: ar.recordset[0], node: 3 };
  } catch (_) {}

  return null;
}

/** Encuentra asiento por ID detectando el nodo automáticamente */
async function findSeatAnyNode(seatId) {
  const db = await getMongoDb();
  const ms = await db.collection('seats').findOne({ id: seatId });
  if (ms) return { seat: ms, node: 1 };

  try {
    const er = await queryEuropa('SELECT * FROM Seats WHERE id = @id',
      { id: { type: sql.Int, value: seatId } });
    if (er.recordset?.[0]) return { seat: er.recordset[0], node: 2 };
  } catch (_) {}

  try {
    const ar = await queryAsia('SELECT * FROM Seats WHERE id = @id',
      { id: { type: sql.Int, value: seatId } });
    if (ar.recordset?.[0]) return { seat: ar.recordset[0], node: 3 };
  } catch (_) {}

  return null;
}

/**
 * Lock optimista: intenta cambiar status de AVAILABLE a _LOCKING.
 * Retorna true si el lock fue adquirido.
 */
async function lockSeat(seatId, node) {
  if (node === 1) {
    const db = await getMongoDb();
    const result = await db.collection('seats').findOneAndUpdate(
      { id: seatId, status: 'AVAILABLE' },
      { $set: { status: '_LOCKING' } },
      { returnDocument: 'after' }
    );
    return result?.status === '_LOCKING';
  }

  // SQL Server (node 2 o 3) — UPDATE con WHERE status='AVAILABLE' es atómico
  const pool = node === 2 ? await getEuropaPool() : await getAsiaPool();
  const req = pool.request();
  req.input('id', sql.Int, seatId);
  const r = await req.query(
    `UPDATE Seats SET status='_LOCKING' WHERE id=@id AND status='AVAILABLE';
     SELECT @@ROWCOUNT AS affected;`
  );
  return (r.recordset?.[0]?.affected ?? 0) > 0;
}

/** Actualiza estado del asiento en su nodo nativo */
async function updateSeatStatus(seatId, node, newStatus, lamportClock) {
  if (node === 1) {
    const db = await getMongoDb();
    await db.collection('seats').updateOne(
      { id: seatId },
      { $set: { status: newStatus, lamport_clock: lamportClock } }
    );
    return;
  }
  const pool = node === 2 ? await getEuropaPool() : await getAsiaPool();
  const req = pool.request();
  req.input('id', sql.Int, seatId);
  req.input('status', sql.VarChar(20), newStatus);
  req.input('lamport', sql.Int, lamportClock);
  await req.query('UPDATE Seats SET status=@status, lamport_clock=@lamport WHERE id=@id');
}

/** Libera lock en caso de error (rollback) */
async function unlockSeat(seatId, node) {
  await updateSeatStatus(seatId, node, 'AVAILABLE', 0);
}

// ── POST /api/bookings ───────────────────────────────────────
router.post('/', async (req, res) => {
  let seatNodeForRollback = null;
  let seatIdForRollback   = null;

  try {
    const { booking_type, full_name, email, currency = 'USD', passenger_region } = req.body;
    const flight_id = parseInt(req.body.flight_id);
    const seat_id   = parseInt(req.body.seat_id);

    if (!flight_id || !seat_id || !booking_type || !full_name || !email)
      return res.status(400).json({ error: 'Faltan campos requeridos' });

    // Mapa región del pasajero → nodo procesador
    const REGION_NODE = { AMERICA: 1, EUROPA: 2, ASIA: 3 };
    // Si el pasajero indicó su región, ese nodo procesa la reserva;
    // si no, se usa el nodo del origen del vuelo (comportamiento anterior).
    // Esto demuestra sharding geográfico: el nodo más cercano al pasajero procesa.

    // 1. Encontrar el vuelo en cualquier nodo
    const flightInfo = await findFlightAnyNode(flight_id);
    if (!flightInfo) return res.status(404).json({ error: 'Vuelo no encontrado' });
    const { flight, node: flightNode } = flightInfo;

    // 2. Encontrar el asiento (puede estar en distinto nodo que el vuelo)
    const seatInfo = await findSeatAnyNode(seat_id);
    if (!seatInfo) return res.status(404).json({ error: 'Asiento no encontrado' });
    const { seat, node: seatNode } = seatInfo;

    if (seat.status !== 'AVAILABLE')
      return res.status(409).json({ error: 'Asiento no disponible' });

    // Nodo procesador: región del pasajero si fue indicada, si no el del vuelo
    const flightOwnerNode = AIRPORT_MAP[flight.origin]?.assigned_node || flightNode;
    const nodeId = REGION_NODE[passenger_region] || flightOwnerNode;

    // ¿Fue una operación cross-node? (el asiento/vuelo está en otro nodo)
    const isCrossNode = nodeId !== seatNode;
    const crossNodeInfo = isCrossNode
      ? { passenger_node: nodeId, flight_node: seatNode }
      : null;

    // 3. Lock optimista en el nodo correcto
    seatNodeForRollback = seatNode;
    seatIdForRollback   = seat_id;
    const locked = await lockSeat(seat_id, seatNode);
    if (!locked)
      return res.status(409).json({ error: 'Asiento no disponible (conflicto de concurrencia)' });

    const lamport = lamportTick(0);
    const vector  = vectorTick([0, 0, 0], nodeId);

    // 4. Crear o recuperar pasajero (siempre en MongoDB)
    const db = await getMongoDb();
    let passenger = await db.collection('passengers').findOne({ email });
    let passengerId;
    if (!passenger) {
      const counter = await db.collection('id_counters').findOneAndUpdate(
        { node: nodeId }, { $inc: { seq: 3 } }, { returnDocument: 'after', upsert: true }
      );
      passengerId = counter.seq;   // seq ya apunta al ID correcto (1, 4, 7…)
      await db.collection('passengers').insertOne({
        id: passengerId, full_name, email,
        created_at: new Date(), created_by_node: nodeId,
      });
    } else {
      passengerId = passenger.id;
    }

    // 5. ID para el booking
    const bCounter = await db.collection('id_counters').findOneAndUpdate(
      { node: nodeId }, { $inc: { seq: 3 } }, { returnDocument: 'after', upsert: true }
    );
    const bookingId = bCounter.seq;

    const newStatus       = booking_type === 'PURCHASE' ? 'SOLD' : 'RESERVED';
    const amount_paid_usd = seat?.price_usd || 0;
    const amount_paid_bs  = +(amount_paid_usd * USD_TO_BS).toFixed(2);

    const booking = {
      id: bookingId, passenger_id: passengerId, flight_id, seat_id,
      booking_type, status: 'ACTIVE',
      amount_paid_usd, amount_paid_bs, currency,
      passenger_region: passenger_region || null,
      cross_node: crossNodeInfo,          // null si mismo nodo, objeto si cross-node
      created_at: new Date(),
      lamport_clock: lamport,
      vector_clock: serializeVector(vector),
      processed_by_node: nodeId,
    };

    // 6. Guardar booking en MongoDB (registro central)
    await db.collection('bookings').insertOne(booking);

    // 7. Actualizar asiento en su nodo nativo
    await updateSeatStatus(seat_id, seatNode, newStatus, lamport);

    propagateToOtherNodes(nodeId, 'BOOKING_CREATE', booking, lamport, vector).catch(console.error);

    res.status(201).json({ success: true, booking_id: bookingId, booking });
  } catch (err) {
    console.error('[POST /bookings] Error:', err.message);
    if (seatNodeForRollback !== null && seatIdForRollback !== null) {
      unlockSeat(seatIdForRollback, seatNodeForRollback).catch(console.error);
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings?email=&id=
router.get('/', async (req, res) => {
  const { email, id } = req.query;
  const db = await getMongoDb();
  const filter = {};
  if (id) filter.id = parseInt(id);
  if (email) {
    const p = await db.collection('passengers').findOne({ email });
    if (!p) return res.json({ data: [] });
    filter.passenger_id = p.id;
  }
  const bookings = await db.collection('bookings').find(filter).sort({ created_at: -1 }).limit(50).toArray();
  res.json({ data: bookings });
});

// GET /api/bookings/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const db = await getMongoDb();
  const booking = await db.collection('bookings').findOne({ id });
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });

  const [passenger, flightInfo, seatInfo] = await Promise.all([
    db.collection('passengers').findOne({ id: booking.passenger_id }),
    findFlightAnyNode(booking.flight_id),
    findSeatAnyNode(booking.seat_id),
  ]);
  res.json({
    booking,
    passenger,
    flight: flightInfo?.flight || null,
    seat:   seatInfo?.seat   || null,
  });
});

// DELETE /api/bookings/:id  — cancelar
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const db = await getMongoDb();
  const booking = await db.collection('bookings').findOne({ id });
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (booking.status !== 'ACTIVE') return res.status(409).json({ error: 'La reserva ya no está activa' });

  const lamport = lamportTick(booking.lamport_clock || 0);
  const vector  = vectorTick(JSON.parse(booking.vector_clock || '[0,0,0]'), booking.processed_by_node || 1);

  await db.collection('bookings').updateOne(
    { id },
    { $set: { status: 'REFUNDED', lamport_clock: lamport, updated_at: new Date() } }
  );

  // Buscar el asiento en su nodo para actualizar
  const seatInfo = await findSeatAnyNode(booking.seat_id);
  const seatNode = seatInfo?.node || 1;
  await updateSeatStatus(booking.seat_id, seatNode, 'REFUNDED', lamport);

  const REFUND_DELAY = parseInt(process.env.REFUND_PROPAGATION_DELAY_MS || '900000');
  setTimeout(async () => {
    try {
      await updateSeatStatus(booking.seat_id, seatNode, 'AVAILABLE', lamport);
    } catch (e) {
      console.error('[Refund timeout] Error restoring seat:', e.message);
    }
  }, REFUND_DELAY);

  propagateToOtherNodes(
    booking.processed_by_node || 1, 'REFUND',
    { booking_id: id, seat_id: booking.seat_id }, lamport, vector
  ).catch(console.error);

  res.json({ success: true, message: 'Reserva cancelada. Asiento disponible en 15 min.' });
});

export default router;
