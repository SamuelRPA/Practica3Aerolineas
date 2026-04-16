import { Router } from 'express';
import { getMongoDb } from '../lib/db/mongodb.js';
import { getCurrentClocks } from '../lib/db/sync.js';

const router = Router();

// GET /api/sync
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit || '50');
  try {
    const db   = await getMongoDb();
    const logs = await db.collection('sync_log').find({}).sort({ timestamp: -1 }).limit(limit).toArray();

    const metrics = await db.collection('sync_log').aggregate([
      { $group: {
        _id: null,
        avg_delay_ms:  { $avg: '$delay_ms' },
        max_delay_ms:  { $max: '$delay_ms' },
        total_events:  { $sum: 1 },
        conflicts:     { $sum: { $cond: [{ $eq: ['$status', 'CONFLICT'] }, 1, 0] } },
        synced:        { $sum: { $cond: [{ $eq: ['$status', 'SYNCED']   }, 1, 0] } },
        pending:       { $sum: { $cond: [{ $eq: ['$status', 'PENDING']  }, 1, 0] } },
      }}
    ]).toArray();

    const { lamport, vector } = getCurrentClocks();
    const MAX_DELAY = parseInt(process.env.MAX_SYNC_DELAY_MS || '10000');
    const m = metrics[0] || {};

    res.json({
      clocks: { lamport, vector },
      metrics: {
        avg_delay_ms: Math.round(m.avg_delay_ms || 0),
        max_delay_ms: m.max_delay_ms   || 0,
        total_events: m.total_events   || 0,
        conflicts:    m.conflicts      || 0,
        synced:       m.synced         || 0,
        pending:      m.pending        || 0,
        health:       (m.avg_delay_ms || 0) <= MAX_DELAY ? 'OK' : 'WARNING',
      },
      logs: logs.map(l => ({ ...l, _id: undefined })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
