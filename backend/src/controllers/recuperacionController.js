const mysql = require('mysql2');
const db = require('../config/db');
const servicio = require('../services/recuperacionService');
const {crearCorreo} = require('../services/correoRecuperacionService');
const {registrarError} = require('../services/errorLog');
let enCurso = 0;
const envios = new Set();

// Enviar fuera del tiempo de respuesta evita distinguir cuentas por la latencia SMTP.
// Cola efímera y acotada: no contiene códigos en disco ni requiere infraestructura nueva.
function despachar(c, correo, result) {
  const job = (async () => {
    await new Promise(resolve => setImmediate(resolve));
    try {
      await correo.enviar(result.email, result.codigo);
      await c.query('UPDATE recuperaciones_password SET enviado=1 WHERE id=? AND consumido=0', [result.id]);
    } catch (e) {
      try { await c.query('UPDATE recuperaciones_password SET consumido=1 WHERE id=?', [result.id]); }
      catch (fallo) { registrarError('Invalidar recuperación no enviada', fallo); }
      registrarError('No se aceptó correo de recuperación', e);
    } finally {
      try { await c.end(); } catch { /* Sin secretos en logs. */ }
      enCurso--;
    }
  })();
  envios.add(job);job.then(() => envios.delete(job));
}

function handler(accion) {
  return async (req, res) => {
    let c, correo, secret, reservado = false;
    try {
      servicio.validar(accion, req.body);
      if (Object.keys(req.query || {}).length) throw Object.assign(new Error('Revisa los datos de recuperación.'), {status: 400});
      secret = servicio.secreto();
      if (accion === 'solicitar') {
        if (enCurso >= 50) throw Object.assign(new Error('La recuperación no está disponible actualmente. Intenta más tarde.'), {status:503});
        enCurso++;reservado=true;
        correo = crearCorreo(); await correo.preparar();
      }
      c = mysql.createConnection(db.dbConfig).promise();
      await c.beginTransaction();
      const result = accion === 'solicitar' ? await servicio.solicitar(c, servicio.correo(req.body), secret) : accion === 'verificar' ? await servicio.verificar(c, servicio.correo(req.body), req.body.codigo, secret) : await servicio.restablecer(c, req.body);
      await c.commit();
      if (accion === 'solicitar') {
        if (result) {
          despachar(c, correo, result);c=null;reservado=false;
        }
        res.set('Cache-Control', 'no-store');
        return res.status(202).json({mensaje: servicio.mensaje});
      }
      res.set('Cache-Control', 'no-store');
      if (result.status) return res.status(result.status).json({error: result.error});
      return res.json(result);
    } catch (e) {
      if (c) try { await c.rollback(); } catch { /* Conservar fallo original. */ }
      if ([400, 429, 503].includes(e.status)) return res.status(e.status).json({error: e.message});
      registrarError('Recuperación de contraseña', e, req);
      return res.status(500).json({error: 'Error interno del servidor.'});
    } finally {
      if (reservado) enCurso--;
      if (c) try { await c.end(); } catch { /* Respuesta emitida. */ }
    }
  };
}
exports.solicitar = handler('solicitar');
exports.verificar = handler('verificar');
exports.restablecer = handler('restablecer');
// Permite esperar trabajos internos durante pruebas/apagado; no se publica como endpoint.
exports.esperarEnvios = () => Promise.all([...envios]);
