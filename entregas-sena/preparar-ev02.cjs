const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'mobile');
const name = 'GA8-220501096-AA2-EV02_Codigo_Fuente_Karol_Julio';
const target = path.join(__dirname, name);
const excludedDirs = new Set(['node_modules','.expo','.verification','dist','.git','coverage','.cache','web-build','android','ios']);
function walk(dir, rel = '') {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) return excludedDirs.has(e.name) ? [] : walk(path.join(dir,e.name),r);
    assert(e.isFile(), `Entrada no regular: ${r}`);
    return [r];
  });
}
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const original = Object.fromEntries(walk(source).map(r=>[r,hash(fs.readFileSync(path.join(source,r)))]));
assert(!fs.existsSync(target), 'La entrega ya existe; no se sobrescribe.');
const forbidden = r => /(^|\/)\.env(?:\.|$)/i.test(r) && r !== '.env.example' || /\.(apk|aab|zip|log|tmp|temp|tsbuildinfo|pem|key|jks|keystore|p12|p8|pfx|sql|sqlite3?|db|bak)$/i.test(r) || /(^|\/)(credentials\.json|\.npmrc|\.netrc|Thumbs\.db|\.DS_Store)$/i.test(r);
const included = Object.keys(original).filter(r=>!forbidden(r));
for (const r of included) {
  const dest = path.join(target,r);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(path.join(source,r),dest);
}
fs.writeFileSync(path.join(target,'.env.example'),'EXPO_PUBLIC_API_URL=https://ejemplo.com\n');
fs.writeFileSync(path.join(target,'README.md'),`# Donde Juanca — aplicación móvil para meseras

Evidencia SENA **GA8-220501096-AA2-EV02: APK — Desarrollo de módulos móviles**.
Entrega de código fuente de Karol Julio. El APK fue generado con Expo EAS Build y probado en un celular Android, según confirmación de la autora. Esta preparación no genera otro APK.

## Descripción y alcance

Donde Juanca permite al personal de atención acceder desde Android al panel de meseras. Incluye bienvenida, login real, validación de identidad y rol, recuperación de sesión y cierre de sesión. Mesas y pedidos muestran «Próximamente»; no implementan operaciones en esta versión.

## Tecnologías y requisitos

Expo SDK 57 (expo ~57.0.30; versión fijada en package-lock.json: 57.0.30), React Native 0.86.3, React 19.2.3, TypeScript, Expo Router, SecureStore, ESLint y pruebas node:test. Se necesitan Node.js 22.13 o superior compatible, npm, Internet para instalar dependencias y un Android con Expo Go compatible con SDK 57. Para compilar en EAS se necesita una cuenta Expo y permisos sobre el proyecto vinculado.

## Estructura

Esta carpeta es la raíz del proyecto móvil; no hay que buscar otra subcarpeta mobile.

- src/app/: bienvenida, acceso, panel y navegación protegida.
- src/components/: componentes reutilizables.
- src/context/: contexto de autenticación y sesión.
- src/services/: API, autenticación y almacenamiento de sesión.
- src/assets/, src/theme/ y src/types/: logo, tema y tipos.
- assets/: recursos gráficos, incluidos iconos y splash de Android.
- plugins/withNetworkSecurity.js: configuración nativa de seguridad de red Android.
- scripts/: preparación de recursos y verificación del archivo de subida EAS.
- tests/: pruebas existentes de autenticación y configuración.
- App.js e index.js: entradas de la aplicación.
- app.json y app.config.js: identidad, plugins y configuración Expo.
- eas.json: perfiles de compilación; package.json y package-lock.json: scripts y dependencias.
- tsconfig.json, eslint.config.js, .gitignore y .easignore: herramientas y exclusiones.

No se mantienen carpetas nativas android/ o ios/: Expo las genera a partir de la configuración y los plugins.

## Instalación y API

Desde esta carpeta extraída:

\x60\x60\x60powershell
npm ci
Copy-Item .env.example .env.local
\x60\x60\x60

Se recomienda npm ci para respetar el lockfile. npm install es una alternativa, pero puede modificarlo. En Windows se puede usar npm.cmd si PowerShell bloquea npm.ps1. No es necesario actualizar dependencias.

El ejemplo contiene únicamente:

\x60\x60\x60dotenv
EXPO_PUBLIC_API_URL=https://ejemplo.com
\x60\x60\x60

Reemplazar por la URL real y accesible de la API en .env.local. Debe ser solo el origen, sin /api, rutas, consultas ni credenciales. El dominio de ejemplo no es un servidor de esta aplicación. localhost apunta al celular y se rechaza. EXPO_PUBLIC_* se incorpora al JavaScript público: nunca colocar secretos allí. La API y sus usuarios deben existir por separado; este paquete no instala ni inicializa MySQL ni el servidor.

## Ejecución con Expo Go

En una terminal sin EAS_BUILD_PROFILE definido:

\x60\x60\x60powershell
npm start -- --clear
\x60\x60\x60

Abrir Expo Go compatible con SDK 57 y escanear el QR. Para una API LAN, teléfono y servidor deben tener conectividad en la misma red privada y el puerto debe ser accesible. Expo Go permite HTTP en desarrollo; preferir HTTPS. El túnel de Metro no publica la API. Reiniciar Metro tras cambiar el entorno. Expo Go no reproduce por completo los recursos nativos del APK.

## Login y rol Mesera

Se envían correo y contraseña a POST /api/usuarios/login. Se exige token Bearer y vigencia válidos y se consulta GET /api/usuarios/me para verificar identidad, estado activo y rol exacto Mesera. Otros roles, incluido Mesero, se rechazan. No se incluyen cuentas ni credenciales de acceso.

SecureStore conserva token, vencimiento y origen de API; no guarda contraseñas. La sesión se valida al restaurar y volver a primer plano. Las rutas están protegidas y cerrar sesión borra el estado y almacenamiento. Errores de red, identidad o expiración impiden acceder al panel. La API debe aplicar también autorización en servidor. Esta versión no ofrece renovación o revocación remota de tokens.

## EAS y APK

eas.json conserva preview (distribución interna, entorno preview, android.buildType apk) y preview-local (hereda preview). Se mantienen owner y projectId originales: identifican el proyecto y no son credenciales. Para usar esa vinculación se necesitan permisos; con otra cuenta debe vincularse una copia al proyecto propio mediante EAS, sin usar credenciales de la autora.

Para una futura reconstrucción con HTTPS, configurar EXPO_PUBLIC_API_URL con el origen real en el entorno preview de EAS. .env.local está excluido de la subida. Desde esta carpeta, los siguientes comandos documentan el proceso; no se ejecutaron al preparar esta entrega:

\x60\x60\x60powershell
$env:EAS_NO_VCS = '1'
$env:EAS_PROJECT_ROOT = (Get-Location).Path
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview --clear-cache
\x60\x60\x60

La firma se administra con la cuenta EAS autorizada; este paquete no contiene claves ni certificados privados. No se requiere publicar en una tienda. .easignore excluye pruebas, scripts y README de la subida EAS, pero se conservan en esta entrega para revisión.

### Limitaciones de preview-local

El perfil original fija un origen LAN específico en eas.json y lo valida también en app.config.js, src/services/api.ts, el plugin y las pruebas. Se conserva literalmente para no cambiar el funcionamiento. No basta cambiar .env.local para cambiar ese perfil. Solo sirve con el servidor original accesible desde esa red privada, encendido y con el puerto autorizado. Usa HTTP sin cifrado y no corresponde a producción. Para otra red se recomienda preview con HTTPS; adaptar la excepción LAN sería un cambio posterior de código/configuración.

El APK funciona sin Metro, pero el login necesita API accesible. EAS no hospeda Express ni MySQL. Cambiar la URL incorporada en un APK requiere reconstruirlo. El backend implementa API, autenticación y persistencia; la app móvil consume esos servicios. Backend, base de datos y frontend web no forman parte de este paquete.

## Comprobaciones y scripts

\x60\x60\x60powershell
npm test
npm run typecheck
npm run lint
\x60\x60\x60

Las pruebas usan fixtures sintéticos y transporte aislado, sin usuarios ni tokens reales. La prueba de inspección EAS se omite si no existe .verification/archive-local-v2, excluida deliberadamente de la entrega. scripts/verify-eas-archive.cjs sirve para una inspección EAS creada previamente, no para validar este ZIP: por defecto requiere aquella carpeta y rechaza archivos .env, incluido el ejemplo. scripts/prepare-brand.cjs regenera recursos con utilidades de imagen de Expo y no es necesario ejecutarlo para compilar.

## Integridad de la entrega

Se copió exclusivamente mobile. Solo README.md y .env.example se ajustaron en esta copia. El resto se compara byte a byte mediante SHA-256 con el original. Se excluyen dependencias instaladas, entornos privados, cachés, exportaciones y material de firma. Los archivos originales permanecen intactos. El informe externo de verificación registra inventario, hashes y resultados sin credenciales.

Referencias: [SDK 57](https://docs.expo.dev/versions/v57.0.0/), [variables de entorno](https://docs.expo.dev/guides/environment-variables/) y [APK con EAS](https://docs.expo.dev/build-reference/apk/).
`);
const changed = ['README.md','.env.example'];
for (const r of included.filter(r=>!changed.includes(r))) assert.equal(hash(fs.readFileSync(path.join(target,r))),original[r],r);
const sensitive = [/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/,/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,/\b(?:DB_PASSWORD|JWT_SECRET|EXPO_TOKEN|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*["'][^"']+["']/];
const env = path.join(source,'.env.local');
const privateValues = fs.existsSync(env) ? fs.readFileSync(env,'utf8').split(/\r?\n/).flatMap(l=>{
 const m=/^\s*([\w]+)\s*=\s*(.*?)\s*$/.exec(l);
 if(!m || !/PASSWORD|SECRET|TOKEN|PRIVATE_KEY/i.test(m[1])) return [];
 const v=m[2].replace(/^(['"])(.*)\1$/,'$2'); return v.length>=6?[v]:[];
}) : [];
const inventory = walk(target).map(r=>{
 const b=fs.readFileSync(path.join(target,r));
 if(!r.endsWith('.png')) {const t=b.toString('utf8');assert(!sensitive.some(p=>p.test(t)),`Patrón sensible: ${r}`);assert(!privateValues.some(v=>t.includes(v)),`Valor privado: ${r}`);}
 return {path:r,bytes:b.length,sha256:hash(b),originalIdentical:!changed.includes(r)};
});
assert.equal(fs.readFileSync(path.join(target,'.env.example'),'utf8'),'EXPO_PUBLIC_API_URL=https://ejemplo.com\n');
for(const [r,h] of Object.entries(original)) assert.equal(hash(fs.readFileSync(path.join(source,r))),h,`Original modificado: ${r}`);
fs.writeFileSync(path.join(__dirname,`${name}_VERIFICACION.json`),JSON.stringify({source:'mobile',folder:name,totalFiles:inventory.length,modifiedOnlyInCopy:changed,excludedFiles:Object.keys(original).filter(r=>!included.includes(r)),excludedDirectories:[...excludedDirs],secretPatternScan:'passed; synthetic test fixtures preserved',originalUnchanged:true,inventory},null,2)+'\n');
console.log(JSON.stringify({folder:target,files:inventory.length,identical:inventory.length-changed.length,secretScan:'passed',originalUnchanged:true}));
