import sql from 'mssql';

// ── Configuración para Docker SQL Server (autenticación SQL) ──
function makeConfig(host, port, db, user, password) {
  return {
    server:   host,
    port:     parseInt(port),
    database: db,
    user,
    password,
    options: {
      trustServerCertificate: true,
      enableArithAbort:       true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

// ── Helper: crea pool con el error handler adjunto ANTES de conectar ──
async function createPool(cfg, label) {
  const pool = new sql.ConnectionPool(cfg);
  // El handler debe estar adjunto ANTES de connect() para que
  // cualquier error emitido durante la conexión no sea "uncaught"
  pool.on('error', (err) => {
    console.error(`[SQL ${label}] Pool error:`, err.message);
    if (label === 'Europa') poolEuropa = null;
    if (label === 'Asia')   poolAsia   = null;
  });
  await pool.connect(); // lanza si SQL Server no está disponible
  return pool;
}

// ── Nodo 2 - Europa (puerto 1433) ────────────────────────────
let poolEuropa = null;
let connectingEuropa = false;
export async function getEuropaPool() {
  if (poolEuropa) return poolEuropa;
  if (connectingEuropa) throw new Error('SQL Europa: conexión en progreso');
  connectingEuropa = true;
  try {
    poolEuropa = await createPool(makeConfig(
      process.env.SQL_EUROPA_HOST     || 'localhost',
      process.env.SQL_EUROPA_PORT     || '1433',
      process.env.SQL_EUROPA_DB       || 'AerolineasEuropa',
      process.env.SQL_EUROPA_USER     || 'sa',
      process.env.SQL_EUROPA_PASSWORD || 'AerolineasRP_2026!',
    ), 'Europa');
    return poolEuropa;
  } catch (err) {
    poolEuropa = null;
    throw err;
  } finally {
    connectingEuropa = false;
  }
}

// ── Nodo 3 - Asia (puerto 1434) ──────────────────────────────
let poolAsia = null;
let connectingAsia = false;
export async function getAsiaPool() {
  if (poolAsia) return poolAsia;
  if (connectingAsia) throw new Error('SQL Asia: conexión en progreso');
  connectingAsia = true;
  try {
    poolAsia = await createPool(makeConfig(
      process.env.SQL_ASIA_HOST     || 'localhost',
      process.env.SQL_ASIA_PORT     || '1434',
      process.env.SQL_ASIA_DB       || 'AerolineasAsia',
      process.env.SQL_ASIA_USER     || 'sa',
      process.env.SQL_ASIA_PASSWORD || 'AerolineasRP_2026!',
    ), 'Asia');
    return poolAsia;
  } catch (err) {
    poolAsia = null;
    throw err;
  } finally {
    connectingAsia = false;
  }
}

// ── Helpers de consulta ──────────────────────────────────────
export async function queryEuropa(queryStr, inputs = {}) {
  const pool    = await getEuropaPool();
  const request = pool.request();
  for (const [name, { type, value }] of Object.entries(inputs)) {
    request.input(name, type, value);
  }
  return request.query(queryStr);
}

export async function queryAsia(queryStr, inputs = {}) {
  const pool    = await getAsiaPool();
  const request = pool.request();
  for (const [name, { type, value }] of Object.entries(inputs)) {
    request.input(name, type, value);
  }
  return request.query(queryStr);
}

export { sql };
