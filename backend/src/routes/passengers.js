import { Router } from 'express';
import { getMongoDb } from '../lib/db/mongodb.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { email, page = '1', limit = '50' } = req.query;
    const db = await getMongoDb();
    const filter = email ? { email } : {};
    const passengers = await db.collection('passengers')
      .find(filter).sort({ created_at: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit)).toArray();
    res.json({ data: passengers });
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
