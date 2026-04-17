/**
 * Motor de sincronización distribuida entre los 3 nodos.
 * - Nodo 1: MongoDB (América)
 * - Nodo 2: SQL Server Europa
 * - Nodo 3: SQL Server Asia
 *
 * Garantías:
 * - Nunca doble venta: lock distribuido antes de confirmar reserva
 * - IDs con salto de llave: N1→+3 desde 1, N2→+3 desde 2, N3→+3 desde 3
 * - Reembolsos con delay de 15 min (consistencia eventual controlada)
 */

import { getMongoDb } from './mongodb.js';
import { queryEuropa, queryAsia, sql } from './sqlserver.js';
import { lamportTick, lamportReceive } from '../clocks/lamport.js';
import { vectorTick, vectorReceive, serializeVector, parseVector } from '../clocks/vector.js';

// ========================
// ESTADO DE RELOJES (en memoria por proceso, persiste en DB)
// ========================
let localLamport = 0;
let localVector = [0, 0, 0];

export function getCurrentClocks() {
  return { lamport: localLamport, vector: localVector };
}

// ========================
// PROPAGACION A LOS 3 NODOS
// ========================

/**
 * Propaga un evento de booking/seat a los otros 2 nodos.
 * @param {number} sourceNode  - nodo que originó el evento (1, 2 o 3)
 * @param {string} eventType   - 'BOOKING_CREATE' | 'SEAT_UPDATE' | 'REFUND'
 * @param {object} payload     - datos del evento
 * @param {number} lamport     - reloj Lamport del evento
 * @param {number[]} vector    - reloj vectorial del evento
 */
export async function propagateToOtherNodes(sourceNode, eventType, payload, lamport, vector) {
  const targets = [1, 2, 3].filter(n => n !== sourceNode);
  const results = [];

  for (const target of targets) {
    const start = Date.now();
    try {
      if (target === 1) {
        await applyEventToMongo(eventType, payload, lamport, vector, sourceNode);
      } else if (target === 2) {
        await applyEventToSql('europa', eventType, payload, lamport, vector, sourceNode);
      } else {
        await applyEventToSql('asia', eventType, payload, lamport, vector, sourceNode);
      }
      const delay = Date.now() - start;
      results.push({ target, success: true, delay_ms: delay });
      await logSync(sourceNode, target, eventType, payload, lamport, vector, 'SYNCED', delay);
    } catch (err) {
      results.push({ target, success: false, error: err.message });
      await logSync(sourceNode, target, eventType, payload, lamport, vector, 'CONFLICT', 0);
    }
  }

  return results;
}

// ========================
// APLICAR EVENTO EN MONGODB
// ========================
async function applyEventToMongo(eventType, payload, lamport, vector, sourceNode) {
  const db = await getMongoDb();
  const receivedVector = parseVector(typeof vector === 'string' ? vector : JSON.stringify(vector));

  // Actualizar relojes locales
  localLamport = lamportReceive(localLamport, lamport);
  localVector = vectorReceive(localVector, receivedVector, 1);

  if (eventType === 'BOOKING_CREATE') {
    await db.collection('bookings').insertOne({
      ...payload,
      lamport_clock: localLamport,
      vector_clock: serializeVector(localVector),
      synced_from_node: sourceNode,
    });
    // Actualizar asiento
    await db.collection('seats').updateOne(
      { id: payload.seat_id },
      { $set: { status: payload.booking_type === 'PURCHASE' ? 'SOLD' : 'RESERVED', lamport_clock: localLamport } }
    );
  } else if (eventType === 'SEAT_UPDATE') {
    await db.collection('seats').updateOne(
      { id: payload.seat_id },
      { $set: { status: payload.status, lamport_clock: localLamport } }
    );
  } else if (eventType === 'REFUND') {
    await db.collection('bookings').updateOne(
      { id: payload.booking_id },
      { $set: { status: 'REFUNDED', lamport_clock: localLamport } }
    );
    await db.collection('seats').updateOne(
      { id: payload.seat_id },
      { $set: { status: 'REFUNDED', lamport_clock: localLamport } }
    );
    // Programar cambio a AVAILABLE después del delay
    setTimeout(async () => {
      const db2 = await getMongoDb();
      await db2.collection('seats').updateOne(
        { id: payload.seat_id },
        { $set: { status: 'AVAILABLE' } }
      );
    }, parseInt(process.env.REFUND_PROPAGATION_DELAY_MS || '900000'));
  } else if (eventType === 'SEAT_AVAILABLE') {
    // ✨ Actualizar asiento a AVAILABLE (propagado tras reembolso de 15 min)
    await db.collection('seats').updateOne(
      { id: payload.seat_id },
      { $set: { status: 'AVAILABLE', lamport_clock: localLamport } }
    );
  } else if (eventType === 'FLIGHT_STATUS') {
    // ✨ Actualizar estado del vuelo
    await db.collection('flights').updateOne(
      { id: payload.flight_id },
      { $set: { status: payload.status, lamport_clock: localLamport, updated_at: new Date() } }
    );
  }
}

// ========================
// APLICAR EVENTO EN SQL SERVER
// ========================
async function applyEventToSql(node, eventType, payload, lamport, vector, sourceNode) {
  const query = node === 'europa' ? queryEuropa : queryAsia;
  const receivedVector = parseVector(typeof vector === 'string' ? vector : JSON.stringify(vector));

  localLamport = lamportReceive(localLamport, lamport);
  localVector = vectorReceive(localVector, receivedVector, node === 'europa' ? 2 : 3);

  if (eventType === 'BOOKING_CREATE') {
    await query(
      `INSERT INTO Bookings (id, passenger_id, flight_id, seat_id, booking_type, status,
        amount_paid_usd, amount_paid_bs, currency, created_at, lamport_clock, vector_clock, processed_by_node)
       VALUES (@id, @pid, @fid, @sid, @btype, @status, @usd, @bs, @cur, @cat, @lam, @vec, @pbn)`,
      {
        id: { type: sql.Int, value: payload.id },
        pid: { type: sql.Int, value: payload.passenger_id },
        fid: { type: sql.Int, value: payload.flight_id },
        sid: { type: sql.Int, value: payload.seat_id },
        btype: { type: sql.VarChar, value: payload.booking_type },
        status: { type: sql.VarChar, value: 'ACTIVE' },
        usd: { type: sql.Float, value: payload.amount_paid_usd },
        bs: { type: sql.Float, value: payload.amount_paid_bs },
        cur: { type: sql.VarChar, value: payload.currency || 'USD' },
        cat: { type: sql.DateTime, value: new Date(payload.created_at) },
        lam: { type: sql.Int, value: localLamport },
        vec: { type: sql.VarChar, value: serializeVector(localVector) },
        pbn: { type: sql.Int, value: sourceNode },
      }
    );
    await query(
      `UPDATE Seats SET status = @status, lamport_clock = @lam WHERE id = @sid`,
      {
        status: { type: sql.VarChar, value: payload.booking_type === 'PURCHASE' ? 'SOLD' : 'RESERVED' },
        lam: { type: sql.Int, value: localLamport },
        sid: { type: sql.Int, value: payload.seat_id },
      }
    );
  } else if (eventType === 'SEAT_UPDATE') {
    await query(
      `UPDATE Seats SET status = @status, lamport_clock = @lam WHERE id = @sid`,
      {
        status: { type: sql.VarChar, value: payload.status },
        lam: { type: sql.Int, value: localLamport },
        sid: { type: sql.Int, value: payload.seat_id },
      }
    );
  } else if (eventType === 'REFUND') {
    await query(`UPDATE Bookings SET status = 'REFUNDED', lamport_clock = @lam WHERE id = @bid`,
      { lam: { type: sql.Int, value: localLamport }, bid: { type: sql.Int, value: payload.booking_id } }
    );
    await query(`UPDATE Seats SET status = 'REFUNDED', lamport_clock = @lam WHERE id = @sid`,
      { lam: { type: sql.Int, value: localLamport }, sid: { type: sql.Int, value: payload.seat_id } }
    );
    setTimeout(async () => {
      const q = node === 'europa' ? queryEuropa : queryAsia;
      await q(`UPDATE Seats SET status = 'AVAILABLE' WHERE id = @sid`,
        { sid: { type: sql.Int, value: payload.seat_id } }
      );
    }, parseInt(process.env.REFUND_PROPAGATION_DELAY_MS || '900000'));
  } else if (eventType === 'SEAT_AVAILABLE') {
    // ✨ Actualizar asiento a AVAILABLE (propagado tras reembolso de 15 min)
    await query(`UPDATE Seats SET status = 'AVAILABLE', lamport_clock = @lam WHERE id = @sid`,
      {
        lam: { type: sql.Int, value: localLamport },
        sid: { type: sql.Int, value: payload.seat_id }
      }
    );
  } else if (eventType === 'FLIGHT_STATUS') {
    // ✨ Actualizar estado del vuelo
    await query(`UPDATE Flights SET status = @status, lamport_clock = @lam, updated_at = GETUTCDATE() WHERE id = @fid`,
      {
        status: { type: sql.VarChar, value: payload.status },
        lam: { type: sql.Int, value: localLamport },
        fid: { type: sql.Int, value: payload.flight_id }
      }
    );
  }
}

// ========================
// LOG DE SINCRONIZACION
// ========================
async function logSync(source, target, eventType, payload, lamport, vector, status, delay_ms) {
  try {
    const db = await getMongoDb();
    await db.collection('sync_log').insertOne({
      event_type: eventType,
      source_node: source,
      target_node: target,
      lamport_clock: lamport,
      vector_clock: typeof vector === 'string' ? vector : JSON.stringify(vector),
      timestamp: new Date(),
      payload: JSON.stringify(payload),
      status,
      delay_ms,
    });
  } catch (e) {
    // No bloquear el flujo principal si el log falla
    console.error('[SyncLog] Error al escribir log:', e.message);
  }
}

// ========================
// SIGUIENTE ID CON SALTO DE LLAVE
// ========================
export async function nextId(nodeId) {
  // Nodo 1 → semilla 1, +3; Nodo 2 → semilla 2, +3; Nodo 3 → semilla 3, +3
  const db = await getMongoDb();
  const counter = await db.collection('id_counters').findOneAndUpdate(
    { node: nodeId },
    { $inc: { seq: 3 } },
    { returnDocument: 'after', upsert: true }
  );
  // Si es la primera vez, inicializar con el seed correcto
  if (!counter.seq || counter.seq <= 3) {
    await db.collection('id_counters').updateOne(
      { node: nodeId },
      { $set: { seq: nodeId } }
    );
    return nodeId;
  }
  return counter.seq - 3 + nodeId; // retornar valor correcto con offset del nodo
}

// ========================
// LOCK DISTRIBUIDO (prevenir doble venta)
// ========================
export async function acquireSeatLock(seatId, nodeId) {
  const db = await getMongoDb();
  const result = await db.collection('seat_locks').findOneAndUpdate(
    { seat_id: seatId, locked: false },
    { $set: { locked: true, locked_by: nodeId, locked_at: new Date() } },
    { upsert: false, returnDocument: 'after' }
  );
  return !!result;
}

export async function releaseSeatLock(seatId) {
  const db = await getMongoDb();
  await db.collection('seat_locks').updateOne(
    { seat_id: seatId },
    { $set: { locked: false, locked_by: null, locked_at: null } }
  );
}
