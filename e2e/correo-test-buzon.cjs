// Buzón sintético E2E: el OTP nunca se escribe en texto claro.
const fs = require('node:fs');
const {randomBytes, createCipheriv, createDecipheriv} = require('node:crypto');

function key() {
  if (process.env.NODE_ENV !== 'test' || !/^[a-f0-9]{64}$/.test(process.env.E2E_MAIL_KEY || '')) {
    throw new Error('Buzón cifrado permitido solo con clave efímera de prueba.');
  }
  return Buffer.from(process.env.E2E_MAIL_KEY, 'hex');
}

function guardar(file, message) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(message), 'utf8'), cipher.final()]);
  fs.appendFileSync(file, JSON.stringify({iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: data.toString('hex')}) + '\n', {mode: 0o600});
}

function leer(file) {
  const secret = key();
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => {
    const item = JSON.parse(line);
    const decipher = createDecipheriv('aes-256-gcm', secret, Buffer.from(item.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(item.tag, 'hex'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(item.data, 'hex')), decipher.final()]).toString('utf8'));
  });
}

module.exports = {guardar, leer};
