import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI no está definido en .env');

let client        = null;
let connectPromise = null;

/** Conecta (lazy) — reutiliza la conexión existente */
async function connect() {
  // Ya conectado
  if (client && client.topology?.isConnected()) return client;

  // Conexión en curso — esperar la misma promesa
  if (connectPromise) {
    try   { return await connectPromise; }
    catch { connectPromise = null; }     // falló → reintentará abajo
  }

  const c = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS:         8000,
    socketTimeoutMS:          15000,
  });

  // Construir la promesa y añadir .catch() ANTES del primer await
  // para que Node.js nunca la vea como "sin manejar"
  connectPromise = c.connect()
    .then(connected => {
      client          = connected;
      connectPromise  = null;
      client.on('error', () => { client = null; });
      return client;
    })
    .catch(err => {
      connectPromise = null;
      client         = null;
      throw err;          // re-lanza para que el llamador lo maneje
    });

  return connectPromise;  // el llamador hará await aquí
}

export async function getMongoDb() {
  const c = await connect();
  return c.db('AerolineasAmerica');
}

export default { connect };
