const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcrypt');

const IDS_DESARROLLO = ['user-001', 'usr-001', 'usr-002', 'usr-003', 'usr-004', 'usr-005'];
const hashValido = valor => /^\$2[ab]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(valor);

async function inicializar({ conexion, ids = IDS_DESARROLLO, aplicar = false,
  password, entorno = process.env.NODE_ENV }) {
  if (!ids.length || ids.some(id => !IDS_DESARROLLO.includes(id))) {
    throw new Error('Solo se permiten los IDs explícitos de usuarios de desarrollo.');
  }
  ids = [...new Set(ids)];
  if (aplicar && !['development', 'test'].includes(entorno)) {
    throw new Error('Aplicar requiere NODE_ENV=development o test.');
  }
  if (aplicar && (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72)) {
    throw new Error('DEV_LOGIN_PASSWORD debe tener al menos 12 caracteres y como máximo 72 bytes.');
  }
  let transaccion = false;
  try {
    if (aplicar) { await conexion.beginTransaction(); transaccion = true; }
    const [usuarios] = await conexion.query(`
      SELECT id, email, estado, roles_id, password_hash FROM usuarios
      WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id ${aplicar ? 'FOR UPDATE' : ''}
    `, ids);
    if (usuarios.length !== ids.length) throw new Error('Alguno de los usuarios solicitados no existe; no se aplican cambios.');
    const resumen = usuarios.map(u => ({
      id: u.id, email: u.email, estado: u.estado, roles_id: u.roles_id,
      accion: hashValido(u.password_hash) ? 'conservar_hash_valido' : 'inicializar_password_hash'
    }));
    if (aplicar) {
      const plantilla = fs.readFileSync(path.join(__dirname, '../database/v2.21_passwords_desarrollo.sql'), 'utf8');
      for (const usuario of usuarios.filter(u => !hashValido(u.password_hash))) {
        const valores = {
          '@dev_bcrypt_hash': await bcrypt.hash(password, 12),
          '@dev_usuario_id': usuario.id, '@dev_hash_anterior': usuario.password_hash
        };
        const parametros = [];
        const sql = plantilla.replace(/@dev_(?:bcrypt_hash|usuario_id|hash_anterior)\b/g,
          nombre => { parametros.push(valores[nombre]); return '?'; });
        const [resultado] = await conexion.query(sql, parametros);
        if (resultado.affectedRows !== 1) throw new Error(`No se inicializó el usuario ${usuario.id}.`);
      }
      await conexion.commit();
      transaccion = false;
    }
    return { aplicado: aplicar, usuarios: resumen };
  } catch (error) {
    if (transaccion) await conexion.rollback();
    throw error;
  }
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const argumentos = process.argv.slice(2);
  if (argumentos.some(a => a !== '--aplicar' && !a.startsWith('--usuarios='))) {
    throw new Error('Opciones: --usuarios=usr-001,usr-002 y --aplicar. Sin --aplicar solo muestra la vista previa.');
  }
  const opcionIds = argumentos.find(a => a.startsWith('--usuarios='));
  const mysql = require('mysql2/promise');
  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 5000
  });
  try {
    console.log(JSON.stringify(await inicializar({
      conexion, ids: opcionIds ? opcionIds.slice('--usuarios='.length).split(',') : IDS_DESARROLLO,
      aplicar: argumentos.includes('--aplicar'), password: process.env.DEV_LOGIN_PASSWORD
    }), null, 2));
  } finally { await conexion.end(); }
}

if (require.main === module) main().catch(error => {
  // No mostrar SQL ni valores de credenciales.
  console.error('No se completó la inicialización:', error.code || error.message);
  process.exitCode = 1;
});
module.exports = { inicializar };
