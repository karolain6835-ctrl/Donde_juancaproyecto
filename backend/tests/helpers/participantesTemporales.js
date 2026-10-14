// Solo sobre tablas TEMPORARY de fixtures: nunca alterar el esquema instalado.
module.exports = async function preparar(c, { items = false, pedidos = false } = {}) {
  await c.query('CREATE TEMPORARY TABLE IF NOT EXISTS copia_identidad_jugadores LIKE jugadores');
  await c.query('CREATE TEMPORARY TABLE IF NOT EXISTS jugadores LIKE copia_identidad_jugadores');
  await c.query(`ALTER TABLE jugadores MODIFY COLUMN nombre VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS pedido_id VARCHAR(36) NULL,
    ADD COLUMN IF NOT EXISTS clientes_id VARCHAR(36) NULL,
    ADD COLUMN IF NOT EXISTS tipo_participante ENUM('registrado','temporal') NULL,
    ADD COLUMN IF NOT EXISTS alias_temporal VARCHAR(100) GENERATED ALWAYS AS
      (CASE WHEN tipo_participante='temporal' THEN LOWER(TRIM(nombre)) ELSE NULL END) PERSISTENT`);
  if (items) await c.query('ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS participante_id VARCHAR(36) NULL');
  if (pedidos) await c.query('ALTER TABLE pedidos MODIFY COLUMN clientes_id VARCHAR(36) NULL');
};
