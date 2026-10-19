const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const configure = require('../app.config');
const plugin = require('../plugins/withNetworkSecurity');
const app = require('../app.json').expo;
const eas = require('../eas.json');

function evaluate(profile, api) {
 const saved = { ...process.env };
 try {
  if (profile) process.env.EAS_BUILD_PROFILE = profile;
  else delete process.env.EAS_BUILD_PROFILE;
  process.env.EXPO_PUBLIC_API_URL = api;
  process.env.EXPO_PUBLIC_LOCAL_API_ALLOWED = 'true'; // intento de habilitarlo desde fuera
  const config = configure({ config: structuredClone(app) });
  return {config, flag:process.env.EXPO_PUBLIC_LOCAL_API_ALLOWED};
 } finally {
  for (const key of ['EAS_BUILD_PROFILE','EXPO_PUBLIC_API_URL','EXPO_PUBLIC_LOCAL_API_ALLOWED']) {
   if(saved[key] === undefined) delete process.env[key]; else process.env[key]=saved[key];
  }
 }
}

test('identidad Android y perfiles APK internos sin producción HTTP', () => {
 assert.equal(app.name,'Donde Juanca');
 assert.equal(app.android.package,'com.dondejuanca.meseras');
 assert.equal(app.version,'1.0.0'); assert.equal(app.android.versionCode,1);
 assert.equal(app.scheme,'dondejuanca');
 assert.equal(eas.build.preview.distribution,'internal');
 assert.equal(eas.build.preview.android.buildType,'apk');
 assert.equal(eas.build['preview-local'].extends,'preview');
 for(const profile of ['preview','production','anything']) {
  assert.throws(()=>evaluate(profile,'http://192.168.2.232:5000'),/HTTPS/);
  assert.equal(evaluate(profile,'https://api.example.invalid').flag,'false');
 }
 assert.throws(()=>evaluate('preview', ''),/Define/);
 assert.throws(()=>evaluate('preview','https://api.example.invalid/api'),/origen/);
 assert.throws(()=>evaluate('preview-local','http://192.168.2.233:5000'),/HTTPS/);
 assert.equal(evaluate('preview-local','http://192.168.2.232:5000').flag,'true');
 assert.equal(evaluate(undefined,'http://192.168.2.232:5000').flag,'false');
});

test('plugin genera política nativa con bloqueo general y excepción solo por IP', async () => {
 const directory = fs.mkdtempSync(path.join(os.tmpdir(),'dondejuanca-network-'));
 try {
  for (const localHttp of [false,true]) {
   const configured = plugin({name:'test',slug:'test'}, {localHttp});
   const manifest = {manifest:{$:{},application:[{$:{'android:name':'.MainApplication'}}]}};
   const mod = await configured.mods.android.manifest({modResults:manifest,modRequest:{},modRawConfig:{}});
   assert.equal(mod.modResults.manifest.application[0].$['android:usesCleartextTraffic'],'false');
   assert.equal(mod.modResults.manifest.application[0].$['android:networkSecurityConfig'],'@xml/dondejuanca_network_security');
   await configured.mods.android.dangerous({modRequest:{platformProjectRoot:directory},modResults:{},modRawConfig:{}});
   const xml = fs.readFileSync(path.join(directory,'app/src/main/res/xml/dondejuanca_network_security.xml'),'utf8');
   assert.match(xml, /base-config cleartextTrafficPermitted="false"/);
   assert.equal(xml.includes('192.168.2.232'),localHttp);
   assert.equal((xml.match(/cleartextTrafficPermitted="true"/g)||[]).length,localHttp?1:0);
   assert.doesNotMatch(xml,/src="user"|includeSubdomains="true"/);
  }
 } finally {fs.rmSync(directory,{recursive:true,force:true});}
});

test('archivo de subida incluye fuentes, plugins y recursos; excluye secretos', () => {
 const ignore = require('ignore')().add(fs.readFileSync(path.join(__dirname,'../.easignore'),'utf8').replace(/^\uFEFF/,''));
 for(const file of ['App.js','index.js','app.json','app.config.js','package.json','package-lock.json','tsconfig.json','plugins/withNetworkSecurity.js','src/app/_layout.tsx','src/services/api.ts','assets/android/icon.png']) assert.equal(ignore.ignores(file),false,file);
 for(const file of ['.env.local','backend/.env','frontend-app/package.json','credentials.json','src/private.key','assets/test.jks','src/.env.production','node_modules/x/index.js','.verification/archive-local-v2/src/app/index.tsx','.expo/settings.json','dist/index.js','android/app/build.gradle']) assert.equal(ignore.ignores(file),true,file);
 assert.deepEqual(app.android.permissions,['android.permission.INTERNET']);
 for(const file of [app.icon,app.android.adaptiveIcon.foregroundImage,'assets/android/splash.png']) assert.ok(fs.existsSync(path.join(__dirname,'..',file)));
});


test('inspecci?n real EAS v2 contiene fuentes completas y ning?n archivo privado', { skip: !fs.existsSync(path.join(__dirname,'../.verification/archive-local-v2/package.json')) }, () => {
 const {execFileSync}=require('node:child_process');
 execFileSync(process.execPath,[path.join(__dirname,'../scripts/verify-eas-archive.cjs')],{stdio:'pipe'});
});
