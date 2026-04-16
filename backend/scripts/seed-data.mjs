/**
 * Siembra los datos estáticos en los 3 nodos:
 * - Aeropuertos, modelos de avión, flota, matrices de precios y tiempos
 *
 * Ejecutar: node scripts/seed-data.js
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import sql from 'mssql';
import { AIRPORTS } from '../src/lib/data/airports.js';
import { AIRCRAFT_MODELS, generateFleet } from '../src/lib/data/aircraft.js';
import { PRICE_MAP, TIME_MAP, CODES } from '../src/lib/data/price-matrix.js';

const MONGODB_URI = process.env.MONGODB_URI;
const USD_TO_BS = parseFloat(process.env.USD_TO_BS || '6.96');

function sqlConfig(node) {
  const isEuropa = node === 'AerolineasEuropa';
  return {
    server:   process.env[isEuropa ? 'SQL_EUROPA_HOST'     : 'SQL_ASIA_HOST']     || 'localhost',
    port:     parseInt(process.env[isEuropa ? 'SQL_EUROPA_PORT' : 'SQL_ASIA_PORT'] || (isEuropa ? '1433' : '1434')),
    user:     process.env[isEuropa ? 'SQL_EUROPA_USER'     : 'SQL_ASIA_USER']     || 'sa',
    password: process.env[isEuropa ? 'SQL_EUROPA_PASSWORD' : 'SQL_ASIA_PASSWORD'] || 'AerolineasRP_2026!',
    options:  { trustServerCertificate: true, enableArithAbort: true },
  };
}

const FLEET = generateFleet();

// ======================== MONGODB ========================
async function seedMongo() {
  console.log('\n[Nodo 1 - MongoDB] Sembrando datos...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('AerolineasAmerica');

  // Aeropuertos
  await db.collection('airports').deleteMany({});
  await db.collection('airports').insertMany(AIRPORTS);
  console.log(`  ✓ ${AIRPORTS.length} aeropuertos`);

  // Modelos de avión
  await db.collection('aircraft_models').deleteMany({});
  await db.collection('aircraft_models').insertMany(AIRCRAFT_MODELS);
  console.log(`  ✓ ${AIRCRAFT_MODELS.length} modelos de avión`);

  // Flota
  await db.collection('fleet').deleteMany({});
  await db.collection('fleet').insertMany(FLEET);
  console.log(`  ✓ ${FLEET.length} aviones en flota`);

  // Matrices de precios
  const priceDocs = [];
  for (const [key, prices] of Object.entries(PRICE_MAP)) {
    const [origin, dest] = key.split('-');
    if (prices.economy !== null) {
      priceDocs.push({ origin, destination: dest, class: 'ECONOMY', price_usd: prices.economy, price_bs: +(prices.economy * USD_TO_BS).toFixed(2) });
    }
    if (prices.first !== null) {
      priceDocs.push({ origin, destination: dest, class: 'FIRST', price_usd: prices.first, price_bs: +(prices.first * USD_TO_BS).toFixed(2) });
    }
  }
  await db.collection('price_matrix').deleteMany({});
  await db.collection('price_matrix').insertMany(priceDocs);
  console.log(`  ✓ ${priceDocs.length} entradas de precios`);

  // Matriz de tiempos
  const timeDocs = [];
  for (const [key, hours] of Object.entries(TIME_MAP)) {
    const [origin, dest] = key.split('-');
    timeDocs.push({ origin, destination: dest, duration_hours: hours });
  }
  await db.collection('flight_time_matrix').deleteMany({});
  await db.collection('flight_time_matrix').insertMany(timeDocs);
  console.log(`  ✓ ${timeDocs.length} entradas de tiempos`);

  // Seat locks vacíos para los asientos existentes
  await db.collection('seat_locks').deleteMany({});

  await client.close();
  console.log('[Nodo 1 - MongoDB] Datos sembrados ✓');
}

// ======================== SQL SERVER ========================
async function seedSql(dbName) {
  console.log(`\n[SQL Server - ${dbName}] Sembrando datos...`);
  const pool = await sql.connect({ ...sqlConfig(dbName), database: dbName });

  // Borrar en orden correcto (dependientes primero)
  // Seats → Flights → Fleet → AircraftModels → Airports / PriceMatrix / FlightTimeMatrix
  const safeDrop = async (tbl) => {
    try { await pool.request().query(`DELETE FROM ${tbl}`); }
    catch (_) { /* tabla vacía o no existe aún */ }
  };
  await safeDrop('Seats');
  await safeDrop('Flights');
  await safeDrop('Fleet');
  await safeDrop('AircraftModels');
  await safeDrop('PriceMatrix');
  await safeDrop('FlightTimeMatrix');
  await safeDrop('SyncLog');
  await safeDrop('Airports');

  // Aeropuertos
  for (const a of AIRPORTS) {
    await pool.request()
      .input('code', sql.VarChar, a.code)
      .input('name', sql.NVarChar, a.name)
      .input('city', sql.NVarChar, a.city)
      .input('country', sql.NVarChar, a.country)
      .input('cc', sql.VarChar, a.country_code)
      .input('lat', sql.Float, a.latitude)
      .input('lng', sql.Float, a.longitude)
      .input('tz', sql.VarChar, a.timezone)
      .input('node', sql.Int, a.assigned_node)
      .query(`INSERT INTO Airports VALUES(@code,@name,@city,@country,@cc,@lat,@lng,@tz,@node)`);
  }
  console.log(`  ✓ ${AIRPORTS.length} aeropuertos`);

  // Modelos
  await pool.request().query('DELETE FROM Fleet; DELETE FROM AircraftModels');
  for (const m of AIRCRAFT_MODELS) {
    await pool.request()
      .input('id', sql.Int, m.id)
      .input('mfr', sql.NVarChar, m.manufacturer)
      .input('model', sql.NVarChar, m.model)
      .input('oc', sql.NVarChar, m.origin_country)
      .input('fc', sql.Int, m.first_class_seats)
      .input('ec', sql.Int, m.economy_seats)
      .input('tc', sql.Int, m.total_seats)
      .input('eng', sql.Int, m.engines)
      .input('et', sql.NVarChar, m.engine_type)
      .input('len', sql.Float, m.length_m)
      .input('ws', sql.Float, m.wingspan_m)
      .input('rkm', sql.Int, m.range_km)
      .input('cs', sql.Int, m.cruise_speed_kmh)
      .input('rnm', sql.Int, m.range_nm)
      .query(`INSERT INTO AircraftModels VALUES(@id,@mfr,@model,@oc,@fc,@ec,@tc,@eng,@et,@len,@ws,@rkm,@cs,@rnm)`);
  }
  console.log(`  ✓ ${AIRCRAFT_MODELS.length} modelos`);

  // Flota
  for (const f of FLEET) {
    await pool.request()
      .input('id', sql.Int, f.id)
      .input('mid', sql.Int, f.aircraft_model_id)
      .input('rc', sql.VarChar, f.registration_code)
      .input('st', sql.VarChar, f.status)
      .query(`INSERT INTO Fleet VALUES(@id,@mid,@rc,@st)`);
  }
  console.log(`  ✓ ${FLEET.length} aviones`);

  // Precios
  await pool.request().query('DELETE FROM PriceMatrix');
  for (const [key, prices] of Object.entries(PRICE_MAP)) {
    const [origin, dest] = key.split('-');
    if (prices.economy !== null) {
      await pool.request()
        .input('o', sql.VarChar, origin)
        .input('d', sql.VarChar, dest)
        .input('cls', sql.VarChar, 'ECONOMY')
        .input('p', sql.Float, prices.economy)
        .input('b', sql.Float, +(prices.economy * USD_TO_BS).toFixed(2))
        .query(`INSERT INTO PriceMatrix(origin,destination,class,price_usd,price_bs) VALUES(@o,@d,@cls,@p,@b)`);
    }
    if (prices.first !== null) {
      await pool.request()
        .input('o', sql.VarChar, origin)
        .input('d', sql.VarChar, dest)
        .input('cls', sql.VarChar, 'FIRST')
        .input('p', sql.Float, prices.first)
        .input('b', sql.Float, +(prices.first * USD_TO_BS).toFixed(2))
        .query(`INSERT INTO PriceMatrix(origin,destination,class,price_usd,price_bs) VALUES(@o,@d,@cls,@p,@b)`);
    }
  }
  console.log('  ✓ Matriz de precios');

  // Tiempos
  await pool.request().query('DELETE FROM FlightTimeMatrix');
  for (const [key, hours] of Object.entries(TIME_MAP)) {
    const [origin, dest] = key.split('-');
    await pool.request()
      .input('o', sql.VarChar, origin)
      .input('d', sql.VarChar, dest)
      .input('h', sql.Int, hours)
      .query(`INSERT INTO FlightTimeMatrix(origin,destination,duration_hours) VALUES(@o,@d,@h)`);
  }
  console.log('  ✓ Matriz de tiempos');

  await pool.close();
  console.log(`[SQL Server - ${dbName}] Datos sembrados ✓`);
}

async function main() {
  console.log('=== Sembrando datos en los 3 nodos ===');

  try {
    await seedMongo();
  } catch (err) {
    console.error('\n[ERROR] MongoDB:', err.message);
    process.exit(1);
  }

  for (const dbName of ['AerolineasEuropa', 'AerolineasAsia']) {
    try {
      await seedSql(dbName);
    } catch (err) {
      console.warn(`[WARN] SQL Server (${dbName}) no disponible: ${err.message.slice(0, 80)}`);
      console.warn('       Inicia Docker Desktop para sembrar datos en Europa/Asia.\n');
    }
  }

  console.log('\n=== ✓ Datos sembrados (ver warnings si hay nodos offline) ===');
  process.exit(0);
}

main();
