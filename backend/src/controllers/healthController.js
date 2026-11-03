const db = require('../config/db');
const {registrarError} = require('../services/errorLog');

// Solo SELECT: no modifica datos ni revela configuración o errores SQL.
async function health(req, res) {
  res.set('Cache-Control', 'no-store');
  try {
    await db.promise().query({sql: 'SELECT 1', timeout: 5000});
    return res.json({status: 'ok', api: 'up', database: 'up'});
  } catch (error) {
    registrarError('Salud MariaDB', error);
    return res.status(503).json({status: 'unavailable', api: 'up', database: 'down'});
  }
}
module.exports = health;
