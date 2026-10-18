import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {solicitarRecuperacion, verificarRecuperacion, restablecerPassword, validarPasswordRecuperacion} from '../src/services/recuperacionService.js';

test('Recuperación service: tres contratos públicos, sin JWT ni almacenamiento de secretos', async () => {
  const old=globalThis.fetch,calls=[];
  try {
    globalThis.fetch=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({mensaje:'Respuesta segura',token_recuperacion:'a'.repeat(64)}));};
    await solicitarRecuperacion('a@example.invalid');await verificarRecuperacion('a@example.invalid','012345');await restablecerPassword('a'.repeat(64),'Nueva','Nueva');
    assert.ok(calls[0].url.endsWith('/usuarios/recuperacion/solicitar'));assert.ok(calls[1].url.endsWith('/usuarios/recuperacion/verificar'));assert.ok(calls[2].url.endsWith('/usuarios/recuperacion/restablecer'));
    assert.deepEqual(JSON.parse(calls[0].options.body),{correo:'a@example.invalid'});
    assert.deepEqual(JSON.parse(calls[1].options.body),{correo:'a@example.invalid',codigo:'012345'});
    assert.deepEqual(JSON.parse(calls[2].options.body),{token_recuperacion:'a'.repeat(64),nueva_contrasena:'Nueva',confirmar_contrasena:'Nueva'});
    assert.ok(calls.every(c=>c.options.method==='POST'&&!c.options.headers.has('Authorization')));
    for(const status of [400,429,503]){globalThis.fetch=async()=>new Response(JSON.stringify({error:'Mensaje seguro del backend'}),{status});await assert.rejects(()=>solicitarRecuperacion('a@example.invalid'),e=>e.status===status&&e.message==='Mensaje seguro del backend');}
  }finally{globalThis.fetch=old;}
});

test('Nueva contraseña mantiene política de bytes y confirmación, sin requisitos inventados',()=>{
  assert.equal(validarPasswordRecuperacion('válida','válida'),'');
  assert.equal(validarPasswordRecuperacion('a','a'),'');
  for(const [a,b]of [['',''],[' ',' '],['á'.repeat(37),'á'.repeat(37)],['Nueva','Otra']])assert.ok(validarPasswordRecuperacion(a,b));
});

test('Panel recuperación: pasos reales, estados remotos, errores seguros y éxito solo después del backend',async t=>{
  const old=globalThis.fetch;
  const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'recuperacion-test',enforce:'pre',transform(s,f){
    if(!f.replaceAll('\\','/').endsWith('/components/RecuperacionPassword.jsx'))return;
    return s.replace("useState('correo')","useState(globalThis.__recPaso||'correo')")
      .replace("const [correo, setCorreo] = useState('');","const [correo, setCorreo] = useState(globalThis.__recCorreo||'a@example.invalid');")
      .replace("const [codigo, setCodigo] = useState('');","const [codigo, setCodigo] = useState(globalThis.__recCodigo||'012345');")
      .replace("const [token, setToken] = useState('');","const [token, setToken] = useState(globalThis.__recToken||'a'.repeat(64));")
      .replace("const [nueva, setNueva] = useState('');","const [nueva, setNueva] = useState(globalThis.__recNueva||'Nueva');")
      .replace("const [confirmar, setConfirmar] = useState('');","const [confirmar, setConfirmar] = useState(globalThis.__recConfirmar||'Nueva');")
      .replace('useState(false)','useState(globalThis.__recBusy||false)')
      .replace("const [error, setError] = useState('');","const [error, realError] = useState(globalThis.__recError||'');const setError=v=>{globalThis.__recError=v;realError(v);};")
      .replace("const [mensaje, setMensaje] = useState('');","const [mensaje, setMensaje] = useState(globalThis.__recMensaje||'');")
      .replace('  return <section','  globalThis.__recSubmit=enviar;return <section');
  }}]});
  try {
    const {default:Panel}=await server.ssrLoadModule('/src/components/RecuperacionPassword.jsx');let closed=0;
    const render=()=>renderToString(React.createElement(Panel,{onClose:()=>closed++}));
    const submit=()=>globalThis.__recSubmit({preventDefault(){}});
    await t.test('correo, código, password oculta, éxito, guardando y errores',()=>{
      assert.match(render(),/Enviar código/);globalThis.__recPaso='codigo';assert.match(render(),/one-time-code/);assert.match(render(),/Solicitar un nuevo código/);
      globalThis.__recPaso='password';assert.equal((render().match(/type="password"/g)||[]).length,2);
      globalThis.__recError='El código no es válido o expiró.';assert.match(render(),/role="alert"/);
      globalThis.__recBusy=true;assert.match(render(),/fieldset class="login-recovery-fields" disabled/);assert.match(render(),/Procesando/);globalThis.__recBusy=false;
      globalThis.__recPaso='exito';assert.match(render(),/Contraseña actualizada correctamente/);assert.equal(closed,0);
    });
    await t.test('solicitar espera respuesta y no envía secretos técnicos',async()=>{
      globalThis.__recPaso='correo';let resolve;globalThis.fetch=()=>new Promise(r=>resolve=r);render();const work=submit();assert.equal(closed,0);resolve(new Response(JSON.stringify({mensaje:'Si el correo está registrado, enviaremos un código.'})));await work;
    });
    await t.test('error de envío, OTP incorrecto/vencido y demasiados intentos se muestran',async()=>{
      for(const [paso,status,error]of [['correo',503,'No fue posible enviar el código.'],['codigo',400,'El código no es válido o expiró.'],['codigo',429,'Demasiados intentos.']]){
        globalThis.__recPaso=paso;globalThis.fetch=async()=>new Response(JSON.stringify({error}),{status});render();await submit();assert.equal(globalThis.__recError,status===503?'La recuperación de contraseña no está disponible actualmente. Intenta más tarde.':error);assert.equal(closed,0);
      }
    });
    await t.test('valida confirmación antes de enviar y oculta errores internos',async()=>{
      globalThis.__recPaso='password';globalThis.__recConfirmar='Otra';let sent=0;globalThis.fetch=async()=>{sent++;return new Response('{}');};render();await submit();assert.equal(sent,0);assert.match(globalThis.__recError,/confirmación/);
      globalThis.__recConfirmar='Nueva';globalThis.fetch=async()=>new Response(JSON.stringify({error:'SMTP_PASSWORD=privado'}),{status:500});render();await submit();assert.doesNotMatch(globalThis.__recError,/privado|SMTP/);assert.equal(closed,0);
      globalThis.fetch=async()=>new Response(JSON.stringify({mensaje:'Contraseña actualizada correctamente.'}));render();await submit();assert.equal(globalThis.__recError,'');
    });
  }finally{globalThis.fetch=old;for(const k of Object.keys(globalThis))if(k.startsWith('__rec'))delete globalThis[k];await server.close();}
});
