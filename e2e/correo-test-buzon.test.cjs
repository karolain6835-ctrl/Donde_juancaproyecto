const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {randomBytes, randomInt} = require('node:crypto');
const {guardar, leer} = require('./correo-test-buzon.cjs');

test('buzón E2E cifra en disco, autentica contenido y requiere clave efímera', () => {
  const saved = {NODE_ENV: process.env.NODE_ENV, E2E_MAIL_KEY: process.env.E2E_MAIL_KEY};
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dj-mail-test-'));
  const file = path.join(dir, 'mail.enc');
  try {
    process.env.NODE_ENV = 'test';
    process.env.E2E_MAIL_KEY = randomBytes(32).toString('hex');
    const message = {to: 'destino@example.invalid', text: String(randomInt(100000, 1000000))};
    assert.deepEqual(leer(file), []);
    guardar(file, message);
    const disk = fs.readFileSync(file, 'utf8');
    assert.equal(disk.includes(message.to), false);
    assert.equal(disk.includes('"text"'), false);
    assert.deepEqual(leer(file), [message]);
    process.env.E2E_MAIL_KEY = randomBytes(32).toString('hex');
    assert.throws(() => leer(file));
    process.env.NODE_ENV = 'production';
    assert.throws(() => guardar(file, message));
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    fs.unlinkSync(file);
    fs.rmdirSync(dir);
  }
});
