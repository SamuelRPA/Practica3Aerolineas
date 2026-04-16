import { Router } from 'express';
import { dijkstra } from '../lib/algorithms/dijkstra.js';
import { tsp }      from '../lib/algorithms/tsp.js';

const router = Router();

// GET /api/routes/dijkstra?origin=ATL&dest=PEK&criterion=cost&class=economy
router.get('/dijkstra', (req, res) => {
  const { origin, dest, criterion = 'cost', class: cls = 'economy' } = req.query;
  if (!origin || !dest)
    return res.status(400).json({ error: 'Se requieren origin y dest' });

  try {
    const result = dijkstra(origin.toUpperCase(), dest.toUpperCase(), criterion, cls);
    if (!result.reachable)
      return res.status(404).json({ error: `No hay ruta accesible de ${origin} a ${dest}` });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/routes/tsp
// Body: { cities: ['ATL','PEK','LON'], criterion: 'cost', cls: 'economy' }
router.post('/tsp', (req, res) => {
  const { cities, criterion = 'cost', cls = 'economy' } = req.body;
  if (!Array.isArray(cities) || cities.length < 2)
    return res.status(400).json({ error: 'Se necesitan al menos 2 ciudades' });
  if (cities.length > 15)
    return res.status(400).json({ error: 'Máximo 15 ciudades' });

  try {
    const result = tsp(cities.map(c => c.toUpperCase()), criterion, cls);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
