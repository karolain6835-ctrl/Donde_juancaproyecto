// Exclusivamente para una instancia LOCAL desechable, nunca para Railway.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {randomUUID, randomBytes} = require('node:crypto');
const mysql = require('mysql2/promise');
const {install, checkManifest} = require('./instalar-bd-v1');

async function main() {
  const port = Number(process.env.POOL_TEST_PORT || 33317);
  assert.ok(Number.isInteger(port) && port > 1024 && port <= 65535 && port !== 3306,
    'Usar un puerto dedicado de pruebas distinto de 3306');
  assert.ok(process.env.POOL_TEST_PASSWORD, 'Falta POOL_TEST_PASSWORD de la instancia desechable');
  checkManifest();
  const config = {host:'127.0.0.1', port, user:'root', password:process.env.POOL_TEST_PASSWORD, connectTimeout:5000};
  const admin = await mysql.createConnection(config);
  const database = 'dj_v1_regression_' + randomUUID().replaceAll('-', '');
  let created = false;
  try {
    const [[version]] = await admin.query('SELECT VERSION() AS version, @@port AS port');
    assert.match(version.version, /^10\.4\..*-MariaDB/);
    assert.equal(Number(version.port), port);
    console.log(JSON.stringify({validation:'mysql-pool',server:version.version,host:config.host,port}));
    await admin.query('CREATE DATABASE `' + database + '` CHARACTER SET utf8 COLLATE utf8_general_ci');
    created = true;
    await install(admin, database);
    const env = {...process.env, DB_HOST:config.host, DB_PORT:String(port), DB_USER:config.user,
      DB_PASSWORD:config.password, DB_NAME:database, JWT_SECRET:randomBytes(32).toString('hex'),
      RECOVERY_HMAC_SECRET:randomBytes(32).toString('hex')};
    const directory = path.join(__dirname, '../tests');
    const all = fs.readdirSync(directory).filter(f => f.endsWith('.test.js'));
    const selected = process.argv.slice(2);
    for (const name of selected) assert.ok(all.includes(name), 'Prueba desconocida: ' + name);
    for (const name of all) {
      for (const match of fs.readFileSync(path.join(directory,name),'utf8').matchAll(/process\.env\.(RUN_(?:MYSQL|MARIADB)_[A-Z0-9_]+)/g)) env[match[1]]='1';
    }
    const files = selected.length ? selected : all;
    process.exitCode = await new Promise((resolve,reject) => {
      const child = spawn(process.execPath, ['--test','--test-reporter=tap','--test-timeout=60000','--test-concurrency=1',
        ...files.map(f => path.join(directory,f))], {cwd:path.join(__dirname,'../..'),env,windowsHide:true,stdio:'inherit'});
      child.on('error',reject);
      child.on('exit',code=>resolve(code ?? 1));
    });
  } finally {
    // La conexión de administración puede caducar mientras se ejecutan las suites.
    // Limpiar solo el esquema generado mediante una conexión local nueva.
    if (created && /^dj_v1_regression_[a-f0-9]{32}$/.test(database)) {
      const cleanup = await mysql.createConnection(config);
      try { await cleanup.query('DROP DATABASE `' + database + '`'); }
      finally { await cleanup.end(); }
    }
    await admin.end().catch(()=>{});
    console.log('Esquema de validacion aislado eliminado.');
  }
}
main().catch(error => {console.error('Validacion fallida:',error.code || error.message);process.exitCode=1;});
