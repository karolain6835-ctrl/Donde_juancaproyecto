// Solo invocar después de crear las tablas TEMPORARY del arnés.
module.exports=async(c,{participantes=false}={})=>{
 await c.query('ALTER TABLE sesiones_division_cuentas ADD COLUMN IF NOT EXISTS sesion_mesa_id VARCHAR(36) NULL');
 if(participantes)await c.query(`ALTER TABLE division_participantes
  ADD COLUMN IF NOT EXISTS jugadores_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS idempotencia_clave VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS solicitud_hash CHAR(64) NULL`);
};
