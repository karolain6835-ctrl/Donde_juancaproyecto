const {randomInt, randomBytes, randomUUID, createHmac, createHash, timingSafeEqual} = require('node:crypto');
const bcrypt = require('bcrypt');
const {registrarAuditoria} = require('./auditoriaService');
const mensaje = 'Si el correo está registrado, enviaremos un código de recuperación.';
const invalido = 'El código no es válido o expiró. Solicita uno nuevo si es necesario.';
const tokenInvalido = 'La autorización no es válida o expiró. Solicita un nuevo código.';
const error = (status, message) => Object.assign(new Error(message), {status});
const sha = value => createHash('sha256').update(value).digest('hex');
const igual = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
function campos(body, keys) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !keys.includes(k)) || keys.some(k => !Object.hasOwn(body, k))) throw error(400, 'Revisa los datos de recuperación.');
}
function correo(body) {
  if (typeof body.correo !== 'string' || body.correo.trim().length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.correo.trim())) throw error(400, 'Ingresa un correo válido.');
  return body.correo.trim().toLowerCase();
}
function validar(accion, body) {
  campos(body, accion === 'solicitar' ? ['correo'] : accion === 'verificar' ? ['correo', 'codigo'] : ['token_recuperacion', 'nueva_contrasena', 'confirmar_contrasena']);
  if (accion !== 'restablecer') correo(body);
  if (accion === 'verificar' && (typeof body.codigo !== 'string' || !/^\d{6}$/.test(body.codigo))) throw error(400, 'Ingresa el código de 6 dígitos.');
  if (accion === 'restablecer') {
    if (typeof body.token_recuperacion !== 'string' || !/^[a-f0-9]{64}$/.test(body.token_recuperacion)) throw error(400, tokenInvalido);
    for (const k of ['nueva_contrasena', 'confirmar_contrasena']) if (typeof body[k] !== 'string' || !body[k].trim() || Buffer.byteLength(body[k], 'utf8') > 72) throw error(400, 'Las contraseñas son obligatorias y admiten máximo 72 bytes.');
    if (body.nueva_contrasena !== body.confirmar_contrasena) throw error(400, 'La confirmación no coincide con la nueva contraseña.');
  }
}
function secreto(env = process.env) {
  if (typeof env.RECOVERY_HMAC_SECRET !== 'string' || Buffer.byteLength(env.RECOVERY_HMAC_SECRET) < 32) throw error(503, 'La recuperación de contraseña no está disponible actualmente.');
  return env.RECOVERY_HMAC_SECRET;
}
const hashOtp = (secret, id, code) => createHmac('sha256', secret).update('recuperacion-otp:' + id + ':' + code).digest('hex');

// Cada operación usa la conexión/transacción del controlador y bloquea usuario antes que recuperación.
async function solicitar(c, email, secret) {
  const [[u]] = await c.query("SELECT id,email,password_hash FROM usuarios WHERE email=? AND estado='activo' FOR UPDATE", [email]);
  if (!u) return null;
  const id = randomUUID(), codigo = String(randomInt(0, 1000000)).padStart(6, '0');
  await c.query('UPDATE recuperaciones_password SET consumido=1 WHERE usuarios_id=? AND consumido=0', [u.id]);
  await c.query(`INSERT INTO recuperaciones_password(id,usuarios_id,otp_hash,credencial_hash,otp_expira_en,creado_en)
    VALUES (?,?,?,?,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 10 MINUTE),UTC_TIMESTAMP(6))`, [id, u.id, hashOtp(secret, id, codigo), sha(u.password_hash)]);
  await registrarAuditoria(c, u.id, 'usuarios', 'recuperacion_solicitada', 'recuperaciones_password', id, {});
  // Solo hacia el transporte interno; nunca serializar este objeto como respuesta HTTP.
  return {id, email: u.email, codigo};
}
async function verificar(c, email, code, secret) {
  const [[u]] = await c.query("SELECT id,password_hash FROM usuarios WHERE email=? AND estado='activo' FOR UPDATE", [email]);
  if (!u) return {status: 400, error: invalido};
  const [[r]] = await c.query(`SELECT *,otp_expira_en>UTC_TIMESTAMP(6) AS vigente FROM recuperaciones_password
    WHERE usuarios_id=? AND consumido=0 ORDER BY creado_en DESC,id DESC LIMIT 1 FOR UPDATE`, [u.id]);
  if (!r || !r.enviado || r.otp_usado || !r.vigente || r.intentos >= 5 || !igual(r.credencial_hash, sha(u.password_hash))) return {status: 400, error: invalido};
  if (!igual(r.otp_hash, hashOtp(secret, r.id, code))) {
    await c.query('UPDATE recuperaciones_password SET intentos=intentos+1,consumido=IF(intentos>=5,1,consumido) WHERE id=?', [r.id]);
    return {status: 400, error: invalido};
  }
  const token = randomBytes(32).toString('hex');
  await c.query('UPDATE recuperaciones_password SET otp_usado=1,token_hash=?,token_expira_en=DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 5 MINUTE) WHERE id=?', [sha(token), r.id]);
  await registrarAuditoria(c, u.id, 'usuarios', 'otp_verificado', 'recuperaciones_password', r.id, {});
  return {token_recuperacion: token, mensaje: 'Código verificado.'};
}
async function restablecer(c, body) {
  const hash = sha(body.token_recuperacion);
  const [[ref]] = await c.query('SELECT usuarios_id FROM recuperaciones_password WHERE token_hash=?', [hash]);
  if (!ref) throw error(400, tokenInvalido);
  const [[u]] = await c.query('SELECT id,password_hash,estado FROM usuarios WHERE id=? FOR UPDATE', [ref.usuarios_id]);
  const [[r]] = await c.query('SELECT *,token_expira_en>UTC_TIMESTAMP(6) AS vigente FROM recuperaciones_password WHERE token_hash=? FOR UPDATE', [hash]);
  if (!u || u.estado !== 'activo' || !r || r.consumido || !r.otp_usado || !r.vigente || !igual(r.credencial_hash, sha(u.password_hash))) throw error(400, tokenInvalido);
  if (/^\$2[ab]\$/.test(u.password_hash) && await bcrypt.compare(body.nueva_contrasena, u.password_hash)) throw error(400, 'La nueva contraseña debe ser diferente de la actual.');
  await c.query('UPDATE usuarios SET password_hash=? WHERE id=?', [await bcrypt.hash(body.nueva_contrasena, 12), u.id]);
  await c.query('UPDATE recuperaciones_password SET consumido=1 WHERE usuarios_id=? AND consumido=0', [u.id]);
  await registrarAuditoria(c, u.id, 'usuarios', 'contrasena_restablecida', 'usuarios', u.id, {});
  return {mensaje: 'Contraseña actualizada correctamente.'};
}
module.exports = {validar, correo, secreto, solicitar, verificar, restablecer, mensaje};
