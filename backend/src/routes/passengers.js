import { Router } from 'express';
import { getMongoDb } from '../lib/db/mongodb.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { email, q, page = '1', limit = '50' } = req.query;
    const db = await getMongoDb();
    
    let filter = {};
    if (email) {
      filter.email = email;
    } else if (q) {
      // Requerimiento: Búsqueda únicamente por pasaporte
      filter = { passport: q };
    }

    const passengers = await db.collection('passengers')
      .find(filter).sort({ created_at: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)).toArray();
    res.json({ data: passengers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper para autocompletado por pasaporte
router.get('/passport/:passport', async (req, res) => {
  try {
    const db = await getMongoDb();
    const passport = req.params.passport;
    const passenger = await db.collection('passengers').findOne({ passport });
    if (!passenger) return res.status(404).json({ error: 'No encontrado' });
    res.json(passenger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await getMongoDb();
    const passenger = await db.collection('passengers').findOne({ id: parseInt(req.params.id) });
    if (!passenger) return res.status(404).json({ error: 'Pasajero no encontrado' });
    res.json(passenger);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
