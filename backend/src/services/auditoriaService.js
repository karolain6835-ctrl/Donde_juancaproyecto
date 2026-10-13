const { randomUUID } = require('node:crypto');
// Se utiliza exclusivamente la conexión de la operación: un fallo aborta su transacción.
const registrarAuditoria = async (conexion, actor, categoria, evento, entidad, entidadId, cambios) => {
  const [r] = await conexion.query(
    `INSERT INTO auditoria (id,categoria,tipo_evento,entidad,entidad_id,cambios_json,resultado,creado_en,usuarios_id)
     VALUES (?,?,?,?,?,?,'exitoso',UTC_TIMESTAMP(),?)`,
    [randomUUID(),categoria,evento,entidad,entidadId,JSON.stringify(cambios),actor]);
  if (r.affectedRows !== 1) throw new Error('No se registró la auditoría.');
};
module.exports = { registrarAuditoria };
