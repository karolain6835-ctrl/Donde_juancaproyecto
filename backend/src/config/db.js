const mysql = require('mysql2');
require('dotenv').config();

// ==========================================
// CONFIGURACIÓN DE BASE DE DATOS
// ==========================================
const entero = (valor, defecto) => {
  const n = Number.parseInt(valor, 10);
  return Number.isInteger(n) && n > 0 ? n : defecto;
};

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // DATETIME UTC se interpreta como UTC, independientemente de la zona de Node.
  // Las columnas históricas locales se convierten explícitamente en sus SELECT.
  timezone: 'Z',
  dateStrings: ['DATE']
};

// ==========================================
// POOL DE CONEXIONES
// ==========================================
// El pool descarta las conexiones muertas (ECONNRESET, cortes por inactividad)
// y abre otras nuevas. La conexión única anterior no tenía listener de 'error':
// al cortarse, Node lanzaba "Unhandled 'error' event" y el proceso terminaba.
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: entero(process.env.DB_POOL_LIMIT, 10),
  queueLimit: 0,
  connectTimeout: entero(process.env.DB_CONNECT_TIMEOUT_MS, 10000),
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  maxIdle: entero(process.env.DB_POOL_MAX_IDLE, 5),
  idleTimeout: entero(process.env.DB_POOL_IDLE_TIMEOUT_MS, 60000)
});

const registrar = (contexto, error) =>
  console.error(`MySQL (${contexto}): ${error && error.code ? error.code : 'error de conexión'}`);

// Cada conexión nueva recibe un listener: un error de red en una conexión
// ociosa se registra y el pool la descarta. Los errores de una consulta en
// curso siguen rechazando su promesa; nada se oculta ni se continúa en falso.
pool.on('connection', (conexion) => {
  conexion.on('error', (error) => registrar('conexión descartada', error));
});

// ==========================================
// CONEXIÓN DEDICADA (para transacciones)
// ==========================================
// Devuelve UNA conexión del pool con API de promesas. Todas las consultas de
// una transacción usan esa misma conexión. `end()` la devuelve al pool (es
// idempotente); si la conexión falló, la destruye en lugar de reutilizarla, y
// si queda una transacción abierta la revierte antes de devolverla.
async function obtenerConexion() {
  let conexion;
  for (let intento = 0; ; intento += 1) {
    conexion = await pool.promise().getConnection();
    try {
      await conexion.ping(); // detecta una conexión ociosa ya cortada
      break;
    } catch (error) {
      conexion.connection.destroy();
      if (intento >= 1) throw error; // un reintento: una conexión vieja es recuperable
    }
  }

  let fallo = false;
  let abierta = false;
  let liberada = false;
  const crudo = conexion.connection;
  crudo.on('error', () => { fallo = true; });

  const envolver = (fn) => async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error && (error.fatal || error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST')) fallo = true;
      throw error;
    }
  };
  const query = conexion.query.bind(conexion);
  const execute = conexion.execute.bind(conexion);
  const begin = conexion.beginTransaction.bind(conexion);
  const commit = conexion.commit.bind(conexion);
  const rollback = conexion.rollback.bind(conexion);
  conexion.query = envolver(query);
  conexion.execute = envolver(execute);
  conexion.beginTransaction = envolver(async () => { await begin(); abierta = true; });
  conexion.commit = envolver(async () => { await commit(); abierta = false; });
  conexion.rollback = envolver(async () => { try { await rollback(); } finally { abierta = false; } });

  // Para estado de sesión que no pudo limpiarse (p. ej. GET_LOCK): no reutilizar.
  conexion.descartar = () => { fallo = true; };

  conexion.end = async () => {
    if (liberada) return;
    liberada = true;
    if (abierta && !fallo) {
      try { await rollback(); } catch (error) { fallo = true; }
    }
    if (fallo) crudo.destroy();
    else conexion.release();
  };
  return conexion;
}

// ==========================================
// EXPORTACIONES
// ==========================================

// El pool conserva db.query(sql, params, cb) y db.promise().query(...).
module.exports = pool;
module.exports.obtenerConexion = obtenerConexion;

// IMPORTANTE:
// usamos "dbConfig" y NO "config",
// porque "config" ya pertenece internamente a mysql2.
module.exports.dbConfig = dbConfig;

// Comprobación de arranque: si la base no responde, se registra y el pool
// reintenta en la siguiente consulta; no termina el proceso.
pool.query('SELECT 1', (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.code || 'fallo de conexión');
    return;
  }
  console.log('Pool de conexiones MySQL/MariaDB listo.');
});
