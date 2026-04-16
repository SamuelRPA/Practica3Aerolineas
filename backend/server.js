import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';

// ── Prevenir que Node v24 mate el proceso por promesas no capturadas ──
process.on('unhandledRejection', (reason) => {
  console.error('[Backend] Promesa rechazada sin capturar:', reason?.message || reason);
  // NO salir — solo loguear
});
process.on('uncaughtException', (err) => {
  console.error('[Backend] Excepción no capturada:', err.message);
  // Solo salir si es verdaderamente fatal (no errores de red/DB)
  if (!['ECONNRESET','EPIPE','ECONNREFUSED','ETIMEDOUT'].includes(err.code)) {
    process.exit(1);
  }
});

import flightsRouter    from './src/routes/flights.js';
import bookingsRouter   from './src/routes/bookings.js';
import routesRouter     from './src/routes/routes.js';
import dashboardRouter  from './src/routes/dashboard.js';
import syncRouter       from './src/routes/sync.js';
import ticketsRouter    from './src/routes/tickets.js';
import passengersRouter from './src/routes/passengers.js';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Rutas ───────────────────────────────────────────────────
app.use('/api/flights',    flightsRouter);
app.use('/api/bookings',   bookingsRouter);
app.use('/api/routes',     routesRouter);
app.use('/api/dashboard',  dashboardRouter);
app.use('/api/sync',       syncRouter);
app.use('/api/tickets',    ticketsRouter);
app.use('/api/passengers', passengersRouter);

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', nodes: 3, timestamp: new Date().toISOString() });
});

// ── Error handler global (Express 4 + Node v24) ──────────────
app.use((err, _req, res, _next) => {
  console.error('[Express] Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

// ── Liberar puerto si está ocupado (Windows) ─────────────────
function freePort(port) {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      if (line.includes(`:${port}`) && line.includes('LISTENING')) {
        const pid = parseInt(line.trim().split(/\s+/).pop());
        if (pid && pid !== process.pid) {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`   ↳ Proceso anterior (PID ${pid}) en :${port} eliminado`);
        }
      }
    }
  } catch (_) { /* sin proceso previo */ }
}

// ── Start ────────────────────────────────────────────────────
function startServer(attempt = 1) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Backend Aerolíneas Rafael Pabón`);
    console.log(`   Puerto : http://127.0.0.1:${PORT}`);
    console.log(`   Nodo 1 : MongoDB  (América  — ATL, LAX, DFW, SAO)`);
    console.log(`   Nodo 2 : SQL Srv  (Europa   — LON, PAR, FRA, IST, MAD, AMS)`);
    console.log(`   Nodo 3 : SQL Srv  (Asia     — PEK, DXB, TYO, SIN, CAN)\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt <= 3) {
      console.log(`\n⚠️  Puerto ${PORT} ocupado — liberando proceso anterior (intento ${attempt})...`);
      freePort(PORT);
      setTimeout(() => startServer(attempt + 1), 800);
    } else {
      console.error(`Error fatal en servidor: ${err.message}`);
      process.exit(1);
    }
  });
}

startServer();
