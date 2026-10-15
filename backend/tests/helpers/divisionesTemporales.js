// Solo invocar después de crear las tablas TEMPORARY del arnés.
module.exports=async(c,{participantes=false}={})=>{
 await c.query('ALTER TABLE sesiones_division_cuentas ADD COLUMN IF NOT EXISTS sesion_mesa_id VARCHAR(36) NULL, ADD COLUMN IF NOT EXISTS estado ENUM(\'activa\',\'completada\',\'cancelada\') NOT NULL DEFAULT \'activa\', ADD COLUMN IF NOT EXISTS completada_en DATETIME NULL, ADD COLUMN IF NOT EXISTS cancelada_en DATETIME NULL, ADD COLUMN IF NOT EXISTS pedido_id VARCHAR(36) NULL, ADD COLUMN IF NOT EXISTS total_objetivo DECIMAL(12,2) NULL, ADD COLUMN IF NOT EXISTS total_cuenta_base DECIMAL(12,2) NULL, ADD COLUMN IF NOT EXISTS cuotas_clave VARCHAR(128) NULL, ADD COLUMN IF NOT EXISTS cuotas_hash CHAR(64) NULL, ADD COLUMN IF NOT EXISTS cuentas_items_json LONGTEXT NULL');
 if(participantes)await c.query(`ALTER TABLE division_participantes
  ADD COLUMN IF NOT EXISTS jugadores_id VARCHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS idempotencia_clave VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS solicitud_hash CHAR(64) NULL`);
};
