import { Router } from 'express';
import { getMongoDb } from '../lib/db/mongodb.js';
import { queryEuropa, queryAsia } from '../lib/db/sqlserver.js';

const router = Router();

// GET /api/dashboard
router.get('/', async (_req, res) => {
  try {
    const [mongoStats, europaStats, asiaStats] = await Promise.allSettled([
      getMongoStats(),
      getSqlStats('europa'),
      getSqlStats('asia'),
    ]);

    const nodes = [
      { node: 1, region: 'América', db: 'MongoDB',     online: mongoStats.status  === 'fulfilled', data: mongoStats.value  || {} },
      { node: 2, region: 'Europa',  db: 'SQL Server',  online: europaStats.status === 'fulfilled', data: europaStats.value || {} },
      { node: 3, region: 'Asia',    db: 'SQL Server',  online: asiaStats.status   === 'fulfilled', data: asiaStats.value   || {} },
    ];

    const all = nodes.filter(n => n.online).map(n => n.data);
    // Agregar estados de vuelo de todos los nodos
    const allStatuses = {};
    for (const d of all) {
      for (const [st, cnt] of Object.entries(d.flight_statuses || {})) {
        allStatuses[st] = (allStatuses[st] || 0) + cnt;
      }
    }

    const totals = {
      total_flights:       all.reduce((s, d) => s + (d.total_flights       || 0), 0),
      total_seats:         all.reduce((s, d) => s + (d.total_seats         || 0), 0),
      seats_available:     all.reduce((s, d) => s + (d.seats_available     || 0), 0),
      seats_reserved:      all.reduce((s, d) => s + (d.seats_reserved      || 0), 0),
      seats_sold:          all.reduce((s, d) => s + (d.seats_sold          || 0), 0),
      total_revenue_usd:   all.reduce((s, d) => s + (d.total_revenue_usd   || 0), 0),
      total_revenue_bs:    all.reduce((s, d) => s + (d.total_revenue_bs    || 0), 0),
      revenue_first_usd:   all.reduce((s, d) => s + (d.revenue_first_usd   || 0), 0),
      revenue_economy_usd: all.reduce((s, d) => s + (d.revenue_economy_usd || 0), 0),
      total_passengers:    all.reduce((s, d) => s + (d.total_passengers    || 0), 0),
      total_bookings:      all.reduce((s, d) => s + (d.total_bookings      || 0), 0),
      flight_statuses:     allStatuses,
    };

    res.json({ nodes, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function getMongoStats() {
  const db = await getMongoDb();
  const [flights, seatStats, bookingStats, passengers, revenueByClass, flightStatuses] = await Promise.all([
    db.collection('flights').countDocuments(),
    db.collection('seats').aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
    db.collection('bookings').aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: null, total_revenue_usd: { $sum: '$amount_paid_usd' }, total_revenue_bs: { $sum: '$amount_paid_bs' }, count: { $sum: 1 } } }
    ]).toArray(),
    db.collection('passengers').countDocuments(),
    db.collection('bookings').aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: '$seat_class', revenue: { $sum: '$amount_paid_usd' } } }
    ]).toArray(),
    db.collection('flights').aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
  ]);

  const seatMap  = Object.fromEntries(seatStats.map(s => [s._id, s.count]));
  const statusMap= Object.fromEntries(flightStatuses.map(s => [s._id, s.count]));
  const b        = bookingStats[0] || {};

  // Calcular ingresos por clase basados en los asientos SOLD (incluye los del seed)
  const revenueByClassFromSeats = await db.collection('seats').aggregate([
    { $match: { status: 'SOLD' } },
    { $group: { _id: '$class', revenue: { $sum: '$price_usd' } } }
  ]).toArray();
  const revMap = Object.fromEntries(revenueByClassFromSeats.map(r => [r._id, r.revenue]));

  return {
    total_flights:      flights,
    total_seats:        Object.values(seatMap).reduce((a, x) => a + x, 0),
    seats_available:    seatMap['AVAILABLE'] || 0,
    seats_reserved:     seatMap['RESERVED']  || 0,
    seats_sold:         seatMap['SOLD']       || 0,
    total_revenue_usd:  Object.values(revMap).reduce((a, b) => a + b, 0),
    total_revenue_bs:   Object.values(revMap).reduce((a, b) => a + b, 0) * 6.96,
    revenue_first_usd:  revMap['FIRST']        || 0,
    revenue_economy_usd:revMap['ECONOMY']      || 0,
    total_passengers:   passengers,
    total_bookings:     b.count               || 0,
    flight_statuses:    statusMap,
  };
}

async function getSqlStats(nodeKey) {
  const q = nodeKey === 'europa' ? queryEuropa : queryAsia;
  const [seats, revenue, flights, passengers, revByClass, topRoutes] = await Promise.all([
    q('SELECT status, COUNT(*) as count FROM Seats GROUP BY status'),
    q("SELECT SUM(amount_paid_usd) as rev_usd, SUM(amount_paid_bs) as rev_bs, COUNT(*) as total FROM Bookings WHERE status = 'ACTIVE'"),
    q('SELECT status, COUNT(*) as count FROM Flights GROUP BY status'),
    q('SELECT COUNT(*) as total FROM Passengers'),
    q(`SELECT s.class, SUM(b.amount_paid_usd) as revenue
       FROM Bookings b JOIN Seats s ON b.seat_id = s.id
       WHERE b.status = 'ACTIVE' GROUP BY s.class`).catch(() => ({ recordset: [] })),
    q(`SELECT TOP 5 f.origin, f.destination, COUNT(*) as bookings
       FROM Bookings b JOIN Flights f ON b.flight_id = f.id
       WHERE b.status = 'ACTIVE' GROUP BY f.origin, f.destination ORDER BY bookings DESC`).catch(() => ({ recordset: [] })),
  ]);

  const seatMap   = {};
  for (const r of (seats.recordset || []))   seatMap[r.status]  = r.count;
  const statusMap = {};
  for (const r of (flights.recordset || [])) statusMap[r.status] = r.count;
  
  // Calcular ingresos por clase basados en los asientos SOLD (SQL)
  const revBySeatClass = await q("SELECT class, SUM(price_usd) as revenue FROM Seats WHERE status = 'SOLD' GROUP BY class");
  const revMap    = {};
  for (const r of (revBySeatClass.recordset || [])) revMap[r.class] = r.revenue || 0;
  
  const rev = revenue.recordset?.[0] || {};

  return {
    total_flights:       Object.values(statusMap).reduce((a, x) => a + x, 0),
    total_seats:         Object.values(seatMap).reduce((a, x) => a + x, 0),
    seats_available:     seatMap['AVAILABLE'] || 0,
    seats_reserved:      seatMap['RESERVED']  || 0,
    seats_sold:          seatMap['SOLD']       || 0,
    total_revenue_usd:   rev.rev_usd           || 0,
    total_revenue_bs:    rev.rev_bs            || 0,
    revenue_first_usd:   revMap['FIRST']        || 0,
    revenue_economy_usd: revMap['ECONOMY']      || 0,
    total_passengers:    passengers.recordset?.[0]?.total || 0,
    total_bookings:      rev.total             || 0,
    flight_statuses:     statusMap,
    top_routes:          (topRoutes.recordset || []).map(r => ({ origin: r.origin, destination: r.destination, bookings: r.bookings })),
  };
}

export default router;
