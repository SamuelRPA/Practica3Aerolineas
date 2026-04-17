/**
 * Crea el esquema de base de datos en los 3 nodos:
 *  - Nodo 1: MongoDB (colecciones + índices)
 *  - Nodo 2: SQL Server - AerolineasEuropa
 *  - Nodo 3: SQL Server - AerolineasAsia
 *
 * Ejecutar: node scripts/create-schema.js
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import sql from 'mssql';

const MONGODB_URI = process.env.MONGODB_URI;

// Configs para los 2 nodos SQL Server (Docker)
const SQL_EUROPA_CONFIG = {
  server:   process.env.SQL_EUROPA_HOST     || 'localhost',
  port:     parseInt(process.env.SQL_EUROPA_PORT || '1433'),
  user:     process.env.SQL_EUROPA_USER     || 'sa',
  password: process.env.SQL_EUROPA_PASSWORD || 'AerolineasRP_2026!',
  options:  { trustServerCertificate: true, enableArithAbort: true },
};
const SQL_ASIA_CONFIG = {
  server:   process.env.SQL_ASIA_HOST     || 'localhost',
  port:     parseInt(process.env.SQL_ASIA_PORT || '1434'),
  user:     process.env.SQL_ASIA_USER     || 'sa',
  password: process.env.SQL_ASIA_PASSWORD || 'AerolineasRP_2026!',
  options:  { trustServerCertificate: true, enableArithAbort: true },
};

// ======================== MONGODB ========================
async function createMongoSchema() {
  console.log('\n[Nodo 1 - MongoDB] Creando esquema...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('AerolineasAmerica');

  // Crear colecciones con validación básica
  const collections = ['airports','aircraft_models','fleet','flights','seats','passengers','bookings','price_matrix','flight_time_matrix','sync_log','seat_locks','id_counters'];
  for (const name of collections) {
    const existing = await db.listCollections({ name }).toArray();
    if (existing.length === 0) {
      await db.createCollection(name);
      console.log(`  ✓ Colección creada: ${name}`);
    } else {
      console.log(`  · Ya existe: ${name}`);
    }
  }

  // Índices clave
  await db.collection('flights').createIndex({ flight_number: 1 });
  await db.collection('flights').createIndex({ origin: 1, destination: 1, departure_time: 1 });
  await db.collection('seats').createIndex({ flight_id: 1, status: 1 });
  await db.collection('seats').createIndex({ id: 1 }, { unique: true });
  await db.collection('bookings').createIndex({ id: 1 }, { unique: true });
  await db.collection('bookings').createIndex({ passenger_id: 1 });
  await db.collection('passengers').createIndex({ email: 1 });
  await db.collection('seat_locks').createIndex({ seat_id: 1 }, { unique: true });
  await db.collection('sync_log').createIndex({ timestamp: -1 });

  // Inicializar contadores de ID por nodo
  for (const nodeId of [1, 2, 3]) {
    const existing = await db.collection('id_counters').findOne({ node: nodeId });
    if (!existing) {
      await db.collection('id_counters').insertOne({ node: nodeId, seq: nodeId - 3 }); // primer next = nodeId
    }
  }

  console.log('[Nodo 1 - MongoDB] Esquema creado ✓\n');
  await client.close();
}

// ======================== SQL SERVER ========================
const SQL_DDL = `
-- Aeropuertos
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Airports')
CREATE TABLE Airports (
  code          VARCHAR(3)    PRIMARY KEY,
  name          NVARCHAR(255) NOT NULL,
  city          NVARCHAR(100) NOT NULL,
  country       NVARCHAR(100) NOT NULL,
  country_code  VARCHAR(3)    NOT NULL,
  latitude      FLOAT         NOT NULL,
  longitude     FLOAT         NOT NULL,
  timezone      VARCHAR(50)   NOT NULL,
  assigned_node INT           NOT NULL
);

-- Modelos de Avión
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AircraftModels')
CREATE TABLE AircraftModels (
  id               INT          PRIMARY KEY,
  manufacturer     NVARCHAR(50) NOT NULL,
  model            NVARCHAR(50) NOT NULL,
  origin_country   NVARCHAR(50),
  first_class_seats INT         NOT NULL,
  economy_seats    INT          NOT NULL,
  total_seats      INT          NOT NULL,
  engines          INT          NOT NULL,
  engine_type      NVARCHAR(20),
  length_m         FLOAT,
  wingspan_m       FLOAT,
  range_km         INT,
  cruise_speed_kmh INT,
  range_nm         INT
);

-- Flota
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Fleet')
CREATE TABLE Fleet (
  id                 INT          PRIMARY KEY,
  aircraft_model_id  INT          NOT NULL REFERENCES AircraftModels(id),
  registration_code  VARCHAR(20)  NOT NULL UNIQUE,
  status             VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
);

-- Vuelos
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Flights')
CREATE TABLE Flights (
  id                    INT           PRIMARY KEY,
  flight_number         VARCHAR(10)   NOT NULL,
  origin                VARCHAR(3)    NOT NULL REFERENCES Airports(code),
  destination           VARCHAR(3)    NOT NULL REFERENCES Airports(code),
  aircraft_id           INT           NOT NULL REFERENCES Fleet(id),
  departure_time        DATETIME      NOT NULL,
  arrival_time          DATETIME      NOT NULL,
  flight_duration_hours INT           NOT NULL,
  status                VARCHAR(20)   NOT NULL DEFAULT 'SCHEDULED',
  lamport_clock         INT           NOT NULL DEFAULT 0,
  vector_clock          VARCHAR(50)   NOT NULL DEFAULT '[0,0,0]',
  processed_by_node     INT           NOT NULL DEFAULT 1,
  route_type            VARCHAR(15)   NOT NULL DEFAULT 'DIRECT',
  connection_via        VARCHAR(200)  NOT NULL DEFAULT '',
  gate                  VARCHAR(10)   NOT NULL DEFAULT ''
);
-- Agregar columnas nuevas si la tabla ya existe (re-ejecución segura)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('Flights') AND name='route_type')
  ALTER TABLE Flights ADD route_type VARCHAR(15) NOT NULL DEFAULT 'DIRECT';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('Flights') AND name='connection_via')
  ALTER TABLE Flights ADD connection_via VARCHAR(200) NOT NULL DEFAULT '';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('Flights') AND name='gate')
  ALTER TABLE Flights ADD gate VARCHAR(10) NOT NULL DEFAULT '';

-- Asientos
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Seats')
CREATE TABLE Seats (
  id            INT          PRIMARY KEY,
  flight_id     INT          NOT NULL REFERENCES Flights(id),
  seat_number   VARCHAR(5)   NOT NULL,
  class         VARCHAR(10)  NOT NULL,
  status        VARCHAR(15)  NOT NULL DEFAULT 'AVAILABLE',
  price_usd     FLOAT        NOT NULL,
  price_bs      FLOAT        NOT NULL,
  lamport_clock INT          NOT NULL DEFAULT 0
);

-- Pasajeros
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Passengers')
CREATE TABLE Passengers (
  id               INT           PRIMARY KEY,
  full_name        NVARCHAR(255) NOT NULL,
  email            NVARCHAR(255) NOT NULL,
  created_at       DATETIME      NOT NULL DEFAULT GETDATE(),
  created_by_node  INT           NOT NULL DEFAULT 1
);

-- Reservas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Bookings')
CREATE TABLE Bookings (
  id               INT           PRIMARY KEY,
  passenger_id     INT           NOT NULL REFERENCES Passengers(id),
  flight_id        INT           NOT NULL REFERENCES Flights(id),
  seat_id          INT           NOT NULL REFERENCES Seats(id),
  booking_type     VARCHAR(15)   NOT NULL,
  status           VARCHAR(15)   NOT NULL DEFAULT 'ACTIVE',
  amount_paid_usd  FLOAT         NOT NULL,
  amount_paid_bs   FLOAT         NOT NULL,
  currency         VARCHAR(5)    NOT NULL DEFAULT 'USD',
  created_at       DATETIME      NOT NULL DEFAULT GETDATE(),
  updated_at       DATETIME,
  lamport_clock    INT           NOT NULL DEFAULT 0,
  vector_clock     VARCHAR(50)   NOT NULL DEFAULT '[0,0,0]',
  processed_by_node INT          NOT NULL DEFAULT 1
);

-- Matriz de Precios
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PriceMatrix')
CREATE TABLE PriceMatrix (
  id          INT         PRIMARY KEY IDENTITY(1,1),
  origin      VARCHAR(3)  NOT NULL REFERENCES Airports(code),
  destination VARCHAR(3)  NOT NULL REFERENCES Airports(code),
  class       VARCHAR(10) NOT NULL,
  price_usd   FLOAT       NOT NULL,
  price_bs    FLOAT       NOT NULL,
  UNIQUE(origin, destination, class)
);

-- Matriz de Tiempos
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FlightTimeMatrix')
CREATE TABLE FlightTimeMatrix (
  id          INT        PRIMARY KEY IDENTITY(1,1),
  origin      VARCHAR(3) NOT NULL REFERENCES Airports(code),
  destination VARCHAR(3) NOT NULL REFERENCES Airports(code),
  duration_hours INT     NOT NULL,
  UNIQUE(origin, destination)
);

-- Log de Sincronización
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SyncLog')
CREATE TABLE SyncLog (
  id           INT          PRIMARY KEY IDENTITY(1,1),
  event_type   VARCHAR(30)  NOT NULL,
  source_node  INT          NOT NULL,
  target_node  INT          NOT NULL,
  lamport_clock INT         NOT NULL,
  vector_clock  VARCHAR(50) NOT NULL,
  timestamp     DATETIME    NOT NULL DEFAULT GETDATE(),
  payload       NVARCHAR(MAX),
  status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  delay_ms      INT         NOT NULL DEFAULT 0
);

-- Columna pasaporte en Passengers
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('Passengers') AND name='passport')
  ALTER TABLE Passengers ADD passport NVARCHAR(30) NULL;
`;

async function createSqlSchema(dbName) {
  const baseConfig = dbName === 'AerolineasEuropa' ? SQL_EUROPA_CONFIG : SQL_ASIA_CONFIG;

  console.log(`\n[SQL Server - ${dbName}] Creando esquema...`);

  // Conectar a master para crear la BD si no existe
  const pool = await sql.connect({ ...baseConfig, database: 'master' });
  await pool.request().query(`
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${dbName}')
      CREATE DATABASE [${dbName}]
  `);
  console.log(`  ✓ Base de datos ${dbName} lista`);
  await pool.close();

  // Conectar a la BD y aplicar DDL
  const pool2 = await sql.connect({ ...baseConfig, database: dbName });
  const statements = SQL_DDL.split(';\n').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    await pool2.request().query(stmt);
  }
  console.log(`[SQL Server - ${dbName}] Esquema creado ✓`);
  await pool2.close();
}

// ======================== MAIN ========================
async function main() {
  console.log('=== Creando esquemas en los 3 nodos ===\n');

  // Nodo 1 (MongoDB) — siempre requerido
  try {
    await createMongoSchema();
  } catch (err) {
    console.error('[ERROR] MongoDB:', err.message);
    process.exit(1);
  }

  // Nodos 2 y 3 (SQL Server) — opcionales si Docker no está activo
  for (const dbName of ['AerolineasEuropa', 'AerolineasAsia']) {
    try {
      await createSqlSchema(dbName);
    } catch (err) {
      console.warn(`[WARN] SQL Server (${dbName}) no disponible: ${err.message.slice(0, 80)}`);
      console.warn('       Inicia Docker Desktop para activar los nodos Europa/Asia.\n');
    }
  }

  console.log('\n=== ✓ Schema completado (ver warnings arriba si hay nodos offline) ===');
  process.exit(0);
}

main();
