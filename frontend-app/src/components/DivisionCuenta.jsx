import {useCallback,useRef,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {formatCurrency} from '../utils/formatCurrency';
import {useRemoteCatalog} from '../hooks/useRemoteCatalog';
import {listarParticipantesMesa} from '../services/participantesService';
import {contextoDivision,obtenerDivision,finalizarDivision,modalidadesDivision,estadosDivision,centavosDivision,decimalDivision,montoCOP,disponiblePagador,estimarIguales,planDivision,ejecutarDivision} from '../services/divisionesService';
import OperacionRemoteState from './OperacionRemoteState';
import './DivisionCuenta.css';
import './OperacionForms.css';
import './CatalogoForm.css';

const empty=()=>({productos:{},clientes:[],cliente:'',cuotas:[]});
const storageKey=id=>`dondejuanca_division_intento_${id}`;
function leerIntento(id){try{return JSON.parse(sessionStorage.getItem(storageKey(id)))||null;}catch{return null;}}
function guardarIntento(id,value){try{if(value)sessionStorage.setItem(storageKey(id),JSON.stringify(value));else sessionStorage.removeItem(storageKey(id));}catch{/* Mantener el intento en memoria si el navegador no permite guardar. */}}

export function DivisionResumen({data}){
 return <section className="division-resumen" aria-label="Resumen de división">
  <div className="division-heading"><h3>División de cuenta</h3><span className={`division-estado ${data.estado}`}>{estadosDivision[data.estado]}</span></div>
  <p>{modalidadesDivision[data.modalidad]}</p>
  {data.desactualizada&&<p className="division-aviso" role="alert">La cuenta cambió después de crear esta división. Revisa los nuevos consumos antes de continuar.</p>}
  {data.estado!=='activa'&&<p>Esta división está {estadosDivision[data.estado].toLowerCase()} y no permite cambios.</p>}
  <dl className="division-totales"><div><dt>Total asignado</dt><dd>{formatCurrency(data.total_asignado)}</dd></div><div><dt>Pagado</dt><dd>{formatCurrency(data.total_pagado)}</dd></div><div><dt>Pendiente de verificación</dt><dd>{formatCurrency(data.pendiente_verificacion)}</dd></div><div><dt>Saldo por pagar</dt><dd>{formatCurrency(disponiblePagador({saldo:data.total_pendiente,pendiente_verificacion:data.pendiente_verificacion}))}</dd></div></dl>
  {!data.participantes.length&&<p>Aún no hay clientes con productos o montos asignados.</p>}
  <div className="division-personas">{data.participantes.map(p=><article key={p.id} className="division-persona"><strong>{p.nombre_cliente}</strong><dl className="division-totales">
   <div><dt>Asignado</dt><dd>{formatCurrency(p.asignado)}</dd></div><div><dt>Pagado</dt><dd>{formatCurrency(p.pagado)}</dd></div><div><dt>Pendiente de verificación</dt><dd>{formatCurrency(p.pendiente_verificacion)}</dd></div><div><dt>Saldo por pagar</dt><dd>{formatCurrency(disponiblePagador(p))}</dd></div>
  </dl></article>)}</div><small>Los pagos pendientes aún requieren verificación. El saldo por pagar descuenta esos pagos pendientes.</small>
 </section>;
}

export function DivisionEditor({modalidad,form,setForm,contexto,clientes,disabled,onSubmit,error}){
 const choose=e=>setForm({...form,cliente:e.target.value});
 const options=<><option value="">Selecciona un cliente</option>{clientes.map(p=><option key={p.id} value={p.id}>{p.nombre} — {p.tipo_participante==='temporal'?'Temporal':'Registrado'}</option>)}</>;
 let assigned=0n,amountError='';
 if(modalidad==='personalizada')for(const p of form.cuotas){try{if(p.monto.trim())assigned+=montoCOP(p.monto);}catch(e){amountError=e.message;}}
 const diferencia=centavosDivision(contexto.saldo)-assigned;
 let valid=false,validationMessage='';try{planDivision(modalidad,form,contexto,clientes);valid=true;}catch(e){validationMessage=e.message;}
 const touched=modalidad==='items'?Object.values(form.productos).some(p=>Object.values(p).some(v=>v!=='')):modalidad==='equitativa'?form.clientes.length>0:modalidad==='total'?Boolean(form.cliente):form.cuotas.some(p=>p.cliente||p.monto);
 return <form className="catalogo-form division-editor" onSubmit={onSubmit}><fieldset disabled={disabled}>
  <legend>{modalidadesDivision[modalidad]}</legend>
  {modalidad==='items'&&<>
   {!contexto.items.some(i=>i.cantidad_disponible>0)&&<p>No hay productos disponibles para asignar.</p>}
   {contexto.items.filter(i=>i.cantidad_disponible>0).map(item=>{
    const cantidades=form.productos[item.id]||{},total=Object.values(cantidades).reduce((n,v)=>n+(Number(v)||0),0);
    return <article className="division-producto" key={item.id}><strong>{item.codigo} — {item.nombre}</strong><p>{item.cantidad_disponible} disponibles · {formatCurrency(item.precio_unitario)} cada uno</p>
     {item.cliente_nombre&&<small>Consumo de {item.cliente_nombre}. Puede pagarlo otro cliente.</small>}
     <p className={total>item.cantidad_disponible?'division-error':''}>{total} de {item.cantidad_disponible} asignadas</p>
     <div className="division-clientes-input">{clientes.map(p=><label key={p.id}>{p.nombre}<input aria-label={`${item.nombre}: cantidad para ${p.nombre}`} type="number" min="0" max={item.cantidad_disponible} step="1" value={cantidades[p.id]??''} onChange={e=>setForm({...form,productos:{...form.productos,[item.id]:{...cantidades,[p.id]:e.target.value}}})}/></label>)}</div>
    </article>;
   })}
  </>}
  {modalidad==='equitativa'&&<><div className="division-seleccion-clientes">{clientes.map(p=><label key={p.id}><input type="checkbox" checked={form.clientes.includes(p.id)} onChange={e=>setForm({...form,clientes:e.target.checked?[...form.clientes,p.id]:form.clientes.filter(id=>id!==p.id)})}/>{p.nombre}</label>)}</div>
   {!!form.clientes.length&&<div className="division-estimacion"><p>Estimación · El total final lo confirma la cuenta.</p>{estimarIguales(contexto.saldo,form.clientes).map(p=><p key={p.jugadores_id}>{clientes.find(c=>c.id===p.jugadores_id)?.nombre}: {formatCurrency(p.monto)}</p>)}</div>}
  </>}
  {modalidad==='total'&&<label>¿Quién paga?<select value={form.cliente} onChange={choose} required>{options}</select></label>}
  {modalidad==='personalizada'&&<>
   {form.cuotas.map((p,index)=><div className="division-monto" key={index}><label>Cliente<select value={p.cliente} onChange={e=>setForm({...form,cuotas:form.cuotas.map((row,i)=>i===index?{...row,cliente:e.target.value}:row)})} required>{options}</select></label>
    <label>Monto<input type="text" inputMode="decimal" placeholder="40.000" value={p.monto} onChange={e=>setForm({...form,cuotas:form.cuotas.map((row,i)=>i===index?{...row,monto:e.target.value}:row)})} required/></label>
    <button type="button" className="drawer-secondary-button" onClick={()=>setForm({...form,cuotas:form.cuotas.filter((_,i)=>i!==index)})}>Quitar cliente</button></div>)}
   <button type="button" className="drawer-secondary-button" disabled={form.cuotas.length>=clientes.length} onClick={()=>setForm({...form,cuotas:[...form.cuotas,{cliente:'',monto:''}]})}>Agregar cliente</button>
   <dl className="division-totales"><div><dt>Total a repartir</dt><dd>{formatCurrency(contexto.saldo)}</dd></div><div><dt>Total asignado</dt><dd>{formatCurrency(decimalDivision(assigned))}</dd></div><div><dt>{diferencia<0n?'Excede':'Falta'}</dt><dd>{formatCurrency(decimalDivision(diferencia<0n?-diferencia:diferencia))}</dd></div></dl>
   {amountError&&<p role="alert">{amountError}</p>}
  </>}
  {modalidad!=='items'&&(centavosDivision(contexto.pendiente_verificacion)>0n||!contexto.total_definitivo)&&<p role="alert">Para repartir montos, la cuenta debe tener un total definitivo y no tener pagos pendientes de verificación.</p>}
  {error&&<p role="alert">{error}</p>}
  {!valid&&touched&&validationMessage!==amountError&&<p role="alert">{validationMessage}</p>}
  <button className="drawer-primary-button" type="submit" disabled={!valid}>Confirmar división</button>
 </fieldset></form>;
}

export default function DivisionCuenta({pedidoId,onClose,onChanged=async()=>{}}){
 const {user}=useAuth();
 const [restored]=useState(()=>leerIntento(pedidoId));
 const attempt=useRef(restored),lock=useRef(false);
 const [attemptUi,setAttemptUi]=useState(restored);
 const [selected,setSelected]=useState(()=>restored?.id||''),[modo,setModo]=useState(()=>restored?.modalidad||'items');
 const [form,setForm]=useState(empty),[busy,setBusy]=useState(false),[frozen,setFrozen]=useState(()=>Boolean(restored)),[error,setError]=useState(''),[success,setSuccess]=useState(''),[confirm,setConfirm]=useState('');
 const catalog=useRemoteCatalog(useCallback(async options=>{
  if(!can(user,'divisiones.ver'))return null;
  const contexto=await contextoDivision(pedidoId,options);
  if(!contexto.pedido.sesion_mesa_id)return {contexto,clientes:[]};
  const personas=await listarParticipantesMesa(contexto.pedido.mesas_id,options);
  if(personas.sesion?.id!==contexto.pedido.sesion_mesa_id)return {contexto,clientes:[]};
  return {contexto,clientes:personas.datos};
 },[pedidoId,user]));
 const division=useRemoteCatalog(useCallback(options=>selected&&can(user,'divisiones.ver')?obtenerDivision(selected,options):Promise.resolve(null),[selected,user]));
 const data=division.data,contexto=catalog.data?.contexto,clientes=catalog.data?.clientes||[];
 const save=value=>{attempt.current=value;setAttemptUi(value?{...value}:null);guardarIntento(pedidoId,value);};
 async function refresh(){await Promise.all([catalog.refresh(),division.refresh(),onChanged()]);}
 async function submit(e){
  e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');setSuccess('');
  try{
   if(!attempt.current){
    const steps=planDivision(data?.modalidad||modo,form,contexto,clientes).map(body=>({body,key:crypto.randomUUID()}));
    save({mesa:contexto.pedido.mesas_id,modalidad:data?.modalidad||modo,id:selected||null,steps,cursor:0});
   }
   setFrozen(true);
   const result=await ejecutarDivision(attempt.current,value=>{save(value);if(value.id)setSelected(value.id);});
   setSelected(result.sesion.id);save(null);setFrozen(false);setForm(empty());setSuccess('División confirmada correctamente.');await refresh();
  }catch(e){
   setError(e.message);
   if(attempt.current?.id)setSelected(attempt.current.id);
   // Un 4xx definitivo sin pasos confirmados permite corregir sobre la cabecera real.
   if([400,403,404,409].includes(e.status)&&attempt.current?.cursor===0&&!attempt.current?.creacionIncierta){save(null);setFrozen(false);}
   if(selected||attempt.current?.id)await refresh();
  }finally{setBusy(false);lock.current=false;}
 }
 async function lifecycle(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{await finalizarDivision(selected,confirm);setSuccess(confirm==='cancelar'?'División cancelada.':'División completada.');setConfirm('');await refresh();}
  catch(e){setError(e.message);}finally{setBusy(false);lock.current=false;}
 }
 function open(id){if(busy)return;setSelected(id);save(null);setFrozen(false);setForm(empty());setSuccess('');setError('');setConfirm('');}
 const compatible=contexto?.pedido.estado==='abierto'&&contexto?.pedido.estado_visita==='activa'&&clientes.length>0&&centavosDivision(contexto.saldo)>0n;
 const otraMonetaria=!selected&&contexto?.divisiones.some(d=>d.estado==='activa'&&d.pedido_id===pedidoId&&d.modalidad!=='items');
 const editable=!otraMonetaria&&compatible&&can(user,selected&&data?.modalidad!=='items'?'divisiones.cuotas':'divisiones.asignarItems')&&(!selected||(data?.sesion.id===selected&&!division.loading&&!division.error&&data?.estado==='activa'&&!data.desactualizada&&(data.modalidad==='items'||!data.participantes.length)));
 const modalidad=selected&&data?data.modalidad:modo;
 const cancelar=can(user,'divisiones.cancelar')&&data?.estado==='activa'&&centavosDivision(data.total_pagado)===0n&&centavosDivision(data.pendiente_verificacion)===0n;
 const completar=can(user,'divisiones.completar')&&data?.estado==='activa'&&!data.desactualizada&&data.total_definitivo&&data.participantes.length>0&&centavosDivision(data.total_pendiente)===0n&&centavosDivision(data.pendiente_verificacion)===0n&&!data.pagos_sin_cuota;
 if(!can(user,'divisiones.ver'))return <p>No tienes permiso para consultar divisiones.</p>;
 return <><div className="division-overlay" aria-hidden="true" onClick={()=>{if(!busy&&!frozen)onClose();}}/><aside className="pedido-drawer division-drawer" role="dialog" aria-modal="true" aria-label="Dividir cuenta">
  <div className="pedido-drawer-header"><h2>Dividir cuenta</h2><button className="drawer-close" aria-label="Cerrar división" disabled={busy||frozen} onClick={onClose}>×</button></div>
  <OperacionRemoteState resource={catalog}/>
  {contexto&&<><p>Mesa {contexto.pedido.mesa_numero}</p><p className="division-saldo">Total pendiente: <strong>{formatCurrency(contexto.saldo)}</strong></p>
   {!!contexto.divisiones.length&&<label className="division-existing">Divisiones de la cuenta<select value={selected} disabled={busy||frozen&&!attemptUi?.creacionIncierta} onChange={e=>open(e.target.value)}><option value="">Crear otra división</option>{contexto.divisiones.map(d=><option key={d.id} value={d.id}>{modalidadesDivision[d.modalidad]} · {estadosDivision[d.estado]} · {d.id.slice(0,8)}</option>)}</select></label>}
   {selected&&<OperacionRemoteState resource={division}/>}
   {selected&&data&&<DivisionResumen data={data}/>}
   {otraMonetaria&&<p>Este pedido ya tiene una divisi?n activa. ?brela en la lista para continuar.</p>}
   {!compatible&&!selected&&<p>No hay una cuenta abierta con clientes y saldo disponible para dividir.</p>}
   {editable&&!frozen&&<>
    {!selected&&<div className="division-modalidades" aria-label="Cómo dividir la cuenta">{Object.entries(modalidadesDivision).map(([value,label])=><button key={value} type="button" className="drawer-secondary-button" aria-pressed={modo===value} disabled={busy} onClick={()=>{setModo(value);setForm(empty());setError('');}}>{label}</button>)}</div>}
    <DivisionEditor modalidad={modalidad} form={form} setForm={setForm} contexto={contexto} clientes={clientes} disabled={busy||catalog.loading||Boolean(catalog.error)||Boolean(selected&&(division.loading||division.error))} onSubmit={submit}/>
   </>}
  </>}
  {frozen&&<div className="division-aviso"><p>{attemptUi?.creacionIncierta?'No se pudo confirmar la creación. Actualiza y abre la división existente antes de continuar.':'La confirmación conserva los datos enviados. Reintenta para continuar sin duplicar lo ya confirmado.'}</p>
   {attemptUi?.creacionIncierta?<div className="operacion-actions"><button className="drawer-secondary-button" disabled={busy} onClick={catalog.refresh}>Actualizar divisiones</button><button className="drawer-secondary-button" disabled={busy} onClick={()=>{save(null);setFrozen(false);onClose();}}>Volver a la cuenta</button></div>:<><button className="drawer-primary-button" disabled={busy} onClick={submit}>Reintentar confirmación</button>{attemptUi?.cursor>0&&<button className="drawer-secondary-button" disabled={busy} onClick={()=>{save(null);setFrozen(false);setForm(empty());refresh();}}>Revisar lo confirmado</button>}</>}
  </div>}
  {data&&!busy&&!frozen&&<div className="operacion-actions">{cancelar&&<button className="drawer-secondary-button" onClick={()=>setConfirm('cancelar')}>Cancelar división</button>}{completar&&<button className="drawer-primary-button" onClick={()=>setConfirm('completar')}>Completar división</button>}</div>}
  {confirm&&<div className="division-aviso" role="alert"><p>{confirm==='cancelar'?'¿Cancelar esta división? Se conservará en el historial.':'¿Completar esta división? Después no permitirá cambios.'}</p><div className="operacion-actions"><button className="drawer-primary-button" disabled={busy} onClick={lifecycle}>Confirmar</button><button className="drawer-secondary-button" disabled={busy} onClick={()=>setConfirm('')}>Volver</button></div></div>}
  {busy&&<p role="status">Procesando...</p>}{error&&<p role="alert" className="division-error">{error}</p>}{success&&<p role="status" className="pedido-feedback">{success}</p>}
  <button className="drawer-secondary-button" disabled={busy} onClick={refresh}>Actualizar cuenta</button>
 </aside></>;
}
