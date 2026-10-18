const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const {spawnSync}=require('node:child_process');
const {statements,checkManifest,install,fileHash}=require('../scripts/instalar-bd-v1');
const manifest=require('../database/migraciones-v1.json');
test('Manifiesto completo, orden numérico y checksums históricos inmutables',()=>{
 checkManifest();assert.equal(manifest.historicas.length,55);
 assert.equal(fileHash(Buffer.from('SQL;\r\n')),fileHash(Buffer.from('SQL;\n')));
 assert.deepEqual(manifest.historicas.map(e=>e.version),[...Array.from({length:10},(_,i)=>'1.'+i),...Array.from({length:45},(_,i)=>'2.'+i)]);
 assert.equal(manifest.historicas.filter(e=>e.bytes===0).length,1);
 assert.equal(manifest.historicas.find(e=>e.bytes===0).file,'v2.20_pagos_division.sql');
 assert.equal(manifest.historicas.filter(e=>!e.file.endsWith('.sql')).length,2);
 assert.deepEqual(manifest.plan_instalacion,['v2.45_instalacion_limpia_v1.sql','v2.46_recuperacion_password_segura.sql']);
});
test('Baseline sin referencias a mydb, definers, datos personales ni contraseñas',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'../database',manifest.baseline.file),'utf8');
 assert.doesNotMatch(sql,/\bUSE\s+|\bCREATE\s+(DATABASE|SCHEMA)\b|DEFINER=|`mydb`|hash_seguro_xyz|user-001|prov-001/i);
 const inserts=statements(sql).filter(s=>/^INSERT/i.test(s));assert.equal(inserts.length,2);
 assert.ok(inserts.every(s=>/^INSERT INTO (roles|configuracion_negocio)\(/.test(s)));
 assert.equal(statements(sql).filter(s=>/^CREATE TABLE/.test(s)).length,50);
 assert.equal(statements(sql).filter(s=>/^ALTER TABLE/.test(s)).length,93);
 assert.equal(statements(sql).filter(s=>/^CREATE TRIGGER/.test(s)).length,3);
 assert.equal(statements(sql).filter(s=>/^CREATE PROCEDURE/.test(s)).length,1);
});
test('Parser mantiene rutinas completas y rechaza SQL incompleto',()=>{
 const sql='DELIMITER $$\nCREATE PROCEDURE p()\nBEGIN\nSELECT 1;\nSELECT 2;\nEND$$\nDELIMITER ;\nSELECT 3;\n';
 const parts=statements(sql);assert.equal(parts.length,2);assert.match(parts[0],/SELECT 1;\nSELECT 2;/);assert.throws(()=>statements('CREATE TABLE x ('),/incompleto/);
});
test('Instalador rechaza destino no vacío o nombre inválido antes de escribir',async()=>{
 const calls=[];const c={query:async sql=>{calls.push(sql);return sql.includes('VERSION')?[[{version:'10.4.32-MariaDB'}]]:[[{n:1}]];}};
 await assert.rejects(()=>install(c,'mydb_existente'),/vacía/);assert.ok(calls.every(s=>s.startsWith('SELECT')));
 await assert.rejects(()=>install(c,'mydb;DROP DATABASE x'),/inválido/);
});
test('Instalación real aislada: DDL, FKs, índices, checks, columnas, triggers y bloqueo de repetición',{skip:process.env.RUN_MARIADB_BOOTSTRAP_TESTS!=='1'},()=>{
 const r=spawnSync(process.execPath,[path.join(__dirname,'../scripts/instalar-bd-v1.js'),'--verify'],{encoding:'utf8',timeout:60000});
 assert.equal(r.status,0,r.stderr||r.stdout);const result=JSON.parse(r.stdout.trim());assert.equal(result.tablas,51);assert.equal(result.claves_foraneas,94);assert.equal(result.triggers,3);assert.equal(result.rutinas,1);
});
