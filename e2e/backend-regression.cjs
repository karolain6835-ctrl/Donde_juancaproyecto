// Ejecuta también las suites SQL optativas sobre un esquema desechable completo.
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const root = path.join(__dirname, '..');
require('../backend/node_modules/dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
const mysql = require('../backend/node_modules/mysql2/promise');
const { install } = require('../backend/scripts/instalar-bd-v1');
async function main() {
  const database = 'dj_v1_regression_' + randomUUID().replaceAll('-', '');
  const c = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
  let created = false;
  try {
    await c.query('CREATE DATABASE `' + database + '` CHARACTER SET utf8 COLLATE utf8_general_ci');
    created = true;
    await install(c, database);
    const env = { ...process.env, DB_NAME: database };
    const dir = path.join(root, 'backend/tests');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js'));
    for (const file of files) {
      for (const match of fs.readFileSync(path.join(dir, file), 'utf8').matchAll(/process\.env\.(RUN_(?:MYSQL|MARIADB)_[A-Z0-9_]+)/g)) env[match[1]] = '1';
    }
    process.exitCode = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--test', '--test-timeout=60000', '--test-concurrency=1', ...files.map(f => path.join(dir, f))], { cwd: root, env, windowsHide: true, stdio: 'inherit' });
      child.on('error', reject);
      child.on('exit', code => resolve(code ?? 1));
    });
  } finally {
    if (created && /^dj_v1_regression_[a-f0-9]{32}$/.test(database)) await c.query('DROP DATABASE `' + database + '`');
    await c.end();
    console.log('Regresión backend: base temporal eliminada.');
  }
}
main().catch(e => { console.error('Falló la regresión backend aislada:', e.code || e.name); process.exitCode = 1; });
