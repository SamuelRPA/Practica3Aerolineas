/**
 * Gestión de estados de vuelos y auto-cancelación
 * Estados: SCHEDULED → DELAYED → (BOARDING) → DEPARTED → IN_FLIGHT → LANDED → ARRIVED
 * Estados alternativos: CANCELLED (autoprogramado si < 60% ocupación)
 */

import { Router } from 'express';
import { getMongoDb } from '../lib/db/mongodb.js';
import { queryEuropa, queryAsia, getEuropaPool, getAsiaPool, sql } from '../lib/db/sqlserver.js';
import { propagateToOtherNodes } from '../lib/db/sync.js';
import { lamportTick } from '../lib/clocks/lamport.js';
import { vectorTick, serializeVector } from '../lib/clocks/vector.js';
import { AIRPORTS } from '../lib/data/airports.js';

const router = Router();

// ── Helpers ──────────────────────────────────────

/** Encuentra vuelo en cualquier nodo */
async function findFlightAnyNode(flightId) {
  const db = await getMongoDb();
  const mf = await db.collection('flights').findOne({ id: flightId });
  if (mf) return { flight: mf, node: 1, nodeType: 'mongo' };

  try {
    const er = await queryEuropa('SELECT * FROM Flights WHERE id = @id',
      { id: { type: sql.Int, value: flightId } });
    if (er.recordset?.[0]) return { flight: er.recordset[0], node: 2, nodeType: 'sql' };
  } catch (_) {}

  try {
    const ar = await queryAsia('SELECT * FROM Flights WHERE id = @id',
      { id: { type: sql.Int, value: flightId } });
    if (ar.recordset?.[0]) return { flight: ar.recordset[0], node: 3, nodeType: 'sql' };
  } catch (_) {}

  return null;
}

/** Actualiza estado del vuelo */
async function updateFlightStatus(flightId, node, nodeType, newStatus, lamport) {
  if (nodeType === 'mongo') {
    const db = await getMongoDb();
    await db.collection('flights').updateOne(
      { id: flightId },
      { $set: { status: newStatus, lamport_clock: lamport, updated_at: new Date() } }
    );
  } else {
    const pool = node === 2 ? await getEuropaPool() : await getAsiaPool();
    const req = pool.request();
    req.input('id', sql.Int, flightId);
    req.input('status', sql.VarChar(20), newStatus);
    req.input('lamport', sql.Int, lamport);
    await req.query(
      'UPDATE Flights SET status=@status, lamport_clock=@lamport, updated_at=GETUTCDATE() WHERE id=@id'
    );
  }
}

/** Obtiene ocupación del vuelo (porcentaje SOLD + RESERVED) */
async function getFlightOccupancy(flightId) {
  const db = await getMongoDb();
  const seats = await db.collection('seats').find({ flight_id: flightId }).toArray();
  if (seats.length === 0) return 0;

  const occupied = seats.filter(s => s.status === 'SOLD' || s.status === 'RESERVED').length;
  return (occupied / seats.length) * 100;
}

// ── GET /api/flight-status/flights-by-date?date=YYYY-MM-DD ──────────────
/**
 * Retorna vuelos de un día específico con su estado actual
 * Incluye ocupación, y checkea si debe ser cancelado (< 60%)
 */
router.get('/flights-by-date', async (req, res) => {
  const { date } = req.query; // YYYY-MM-DD format
  if (!date) return res.status(400).json({ error: 'Parámetro date requerido (YYYY-MM-DD)' });

  try {
    const db = await getMongoDb();

    // Buscar en MongoDB (Nodo 1)
    const mongoFlights = await db.collection('flights')
      .find({
        departure_time: {
          $gte: new Date(`${date}T00:00:00Z`),
          $lt: new Date(`${date}T23:59:59Z`),
        }
      })
      .sort({ departure_time: 1 })
      .toArray();

    // Buscar en SQL Europa (Nodo 2)
    const europaFlights = await queryEuropa(
      `SELECT * FROM Flights WHERE 
       CAST(departure_time AS DATE) = CAST(@date AS DATE)
       ORDER BY departure_time ASC`,
      { date: { type: sql.DateTime, value: new Date(date) } }
    );

    // Buscar en SQL Asia (Nodo 3)
    const asiaFlights = await queryAsia(
      `SELECT * FROM Flights WHERE 
       CAST(departure_time AS DATE) = CAST(@date AS DATE)
       ORDER BY departure_time ASC`,
      { date: { type: sql.DateTime, value: new Date(date) } }
    );

    // Combinar resultados
    const allFlights = [
      ...mongoFlights,
      ...(europaFlights.recordset || []),
      ...(asiaFlights.recordset || []),
    ];

    // Enriquecer con ocupación y estado
    const enrichedFlights = await Promise.all(
      allFlights.map(async (flight) => {
        let occupancy = 0;
        try {
          occupancy = await getFlightOccupancy(flight.id);
        } catch (_) {}

        // Auto-cancelar si < 60% y aún está SCHEDULED
        let status = flight.status || 'SCHEDULED';
        if (status === 'SCHEDULED' && occupancy < 60) {
          status = 'CANCELLED';
        }

        return {
          id: flight.id,
          origin: flight.origin,
          destination: flight.destination,
          departure_time: flight.departure_time,
          aircraft_type: flight.aircraft_type,
          gate: flight.gate || 'TBD',
          status: status,
          occupancy: Math.round(occupancy),
        };
      })
    );

    res.json({
      date,
      flights: enrichedFlights,
      total: enrichedFlights.length,
    });
  } catch (err) {
    console.error('[GET /flight-status/flights-by-date] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/flight-status/:flightId ──────────────────────────────────
/**
 * Obtiene detalles de un vuelo específico + ocupación + estado
 */
router.get('/:flightId', async (req, res) => {
  const flightId = parseInt(req.params.flightId);

  try {
    const flightInfo = await findFlightAnyNode(flightId);
    if (!flightInfo) {
      return res.status(404).json({ error: 'Vuelo no encontrado' });
    }

    const occupancy = await getFlightOccupancy(flightId);
    const flight = flightInfo.flight;

    let status = flight.status || 'SCHEDULED';
    if (status === 'SCHEDULED' && occupancy < 60) {
      status = 'CANCELLED';
    }

    res.json({
      flight: {
        ...flight,
        status: status,
        occupancy: Math.round(occupancy),
        occupancy_percent: Math.round(occupancy),
      },
    });
  } catch (err) {
    console.error('[GET /flight-status/:id] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/flight-status/:flightId/status ──────────────────────────────
/**
 * Actualiza manualmente el estado de un vuelo
 * Estados válidos: SCHEDULED, DELAYED, BOARDING, DEPARTED, IN_FLIGHT, LANDED, ARRIVED, CANCELLED
 */
router.put('/:flightId/status', async (req, res) => {
  const flightId = parseInt(req.params.flightId);
  const { status } = req.body;

  const VALID_STATUSES = ['SCHEDULED', 'DELAYED', 'BOARDING', 'DEPARTED', 'IN_FLIGHT', 'LANDED', 'ARRIVED', 'CANCELLED'];
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Estado inválido. Válidos: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const flightInfo = await findFlightAnyNode(flightId);
    if (!flightInfo) {
      return res.status(404).json({ error: 'Vuelo no encontrado' });
    }

    const lamport = lamportTick((flightInfo.flight.lamport_clock || 0));
    const vector = vectorTick([0, 0, 0], flightInfo.node);

    // Actualizar en nodo nativo
    await updateFlightStatus(flightId, flightInfo.node, flightInfo.nodeType, status, lamport);

    // Propagar a otros nodos
    const statusEvent = {
      flight_id: flightId,
      status: status,
      lamport_clock: lamport,
      vector_clock: serializeVector(vector),
    };
    propagateToOtherNodes(flightInfo.node, 'FLIGHT_STATUS', statusEvent, lamport, vector).catch(console.error);

    res.json({
      success: true,
      flight_id: flightId,
      new_status: status,
      message: `Vuelo actualizado a ${status}`,
    });
  } catch (err) {
    console.error('[PUT /flight-status/:id/status] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/flight-status/occupancy-report ──────────────────────────────
/**
 * Reporte de vuelos en riesgo de cancelación (< 60% ocupación)
 */
router.get('/report/cancellation-risk', async (req, res) => {
  try {
    const db = await getMongoDb();

    // Obtener todos los vuelos futuros (SCHEDULED)
    const now = new Date();
    const futureFlights = await db.collection('flights')
      .find({
        status: 'SCHEDULED',
        departure_time: { $gt: now },
      })
      .sort({ departure_time: 1 })
      .limit(100)
      .toArray();

    // Calcular ocupación de cada uno
    const atRisk = await Promise.all(
      futureFlights.map(async (flight) => {
        const occupancy = await getFlightOccupancy(flight.id);
        return {
          id: flight.id,
          origin: flight.origin,
          destination: flight.destination,
          departure_time: flight.departure_time,
          occupancy: Math.round(occupancy),
          at_risk: occupancy < 60,
        };
      })
    );

    // Filtrar solo los en riesgo
    const riskFlights = atRisk.filter(f => f.at_risk);

    res.json({
      total_scheduled: futureFlights.length,
      at_risk_count: riskFlights.length,
      flights: riskFlights,
    });
  } catch (err) {
    console.error('[GET /flight-status/report/cancellation-risk] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
