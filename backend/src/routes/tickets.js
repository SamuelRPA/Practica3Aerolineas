import { Router } from 'express';
import { getMongoDb } from '../lib/db/mongodb.js';

const router = Router();

// GET /api/tickets/pdf?booking_id=123
// Devuelve los datos necesarios para que el frontend genere el PDF
router.get('/pdf', async (req, res) => {
  const bookingId = parseInt(req.query.booking_id);
  if (!bookingId) return res.status(400).json({ error: 'booking_id requerido' });

  const db      = await getMongoDb();
  const booking = await db.collection('bookings').findOne({ id: bookingId });
  if (!booking)  return res.status(404).json({ error: 'Reserva no encontrada' });

  const [passenger, flight, seat] = await Promise.all([
    db.collection('passengers').findOne({ id: booking.passenger_id }),
    db.collection('flights').findOne({ id: booking.flight_id }),
    db.collection('seats').findOne({ id: booking.seat_id }),
  ]);

  res.json({ booking, passenger, flight, seat });
});

export default router;
