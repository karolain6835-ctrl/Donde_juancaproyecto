const mysql = require('mysql2');
const {clearTimeout} = require('node:timers');
const {registrarError} = require('../services/errorLog');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: 'Z',
  dateStrings: ['DATE'],
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

const pool = mysql.createPool({
  ...dbConfig,
  connectionLimit: 10,
  maxIdle: 5,
  idleTimeout: 60000,
  // Rechazar saturación en vez de acumular solicitudes sin límite de tiempo.
  waitForConnections: false
});

pool.on('error', error => registrarError('Pool MariaDB', error));
pool.on('connection', connection => {
  // mysql2 retira las conexiones rotas del pool. El listener evita que un error
  // de socket sin consulta activa se convierta en una excepción no manejada.
  connection.on('error', error => registrarError('Conexión MariaDB', error));
  const query = connection.query.bind(connection);
  connection.query = (sql, values, callback) => {
    // Pool.query entrega un comando ya creado; conservar callback y listeners.
    const command = typeof sql?.start === 'function' ? sql : mysql.createQuery(sql, values, callback, connection.config);
    command.timeout = command.timeout || 30000;
    const onError = error => {
      if (error && command.queryTimeout) { clearTimeout(command.queryTimeout); command.queryTimeout = null; }
      if (error?.code === 'PROTOCOL_SEQUENCE_TIMEOUT') {
        // El resultado de una escritura puede ser incierto: descartar, sin repetir.
        connection.destroy();
        registrarError('Timeout MariaDB; operación no reintentada', error);
      }
    };
    if (command.onResult) {
      const result = command.onResult;
      command.onResult = (error, ...args) => { onError(error); result(error, ...args); };
    } else command.once('error', onError);
    return query(command);
  };
});

// Una transacción conserva la misma conexión hasta su liberación. Si no se pudo
// confirmar COMMIT/ROLLBACK, se destruye para no reutilizar una sesión incierta.
async function acquire() {
  const connection = await pool.promise().getConnection();
  let transaction = false, released = false;
  const query = connection.query.bind(connection);
  connection.query = (sql, ...args) => {
    const text = typeof sql === 'string' ? sql : sql?.sql;
    if (/^\s*(START TRANSACTION|BEGIN|SET TRANSACTION)\b/i.test(text || '')) transaction = true;
    return query(sql, ...args);
  };
  const begin = connection.beginTransaction.bind(connection);
  const commit = connection.commit.bind(connection);
  const rollback = connection.rollback.bind(connection);
  const release = connection.release.bind(connection);
  connection.beginTransaction = async () => { transaction = true; return begin(); };
  connection.commit = async () => { const result = await commit(); transaction = false; return result; };
  connection.rollback = async () => {
    try { const result = await rollback(); transaction = false; return result; }
    catch (error) { connection.destroy(); throw error; }
  };
  connection.release = () => {
    if (released) return;
    released = true;
    if (transaction) connection.destroy();
    else release();
  };
  connection.end = async () => connection.release();
  return connection;
}

module.exports = pool;
module.exports.dbConfig = dbConfig;
module.exports.acquire = acquire;
// Compatibilidad con el contrato publicado previamente en esta rama.
module.exports.obtenerConexion = acquire;
