import {useCallback,useRef,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {formatCurrency} from '../utils/formatCurrency';
import {formatDateTime} from '../utils/dateTime';
import {useRemoteCatalog} from '../hooks/useRemoteCatalog';
import {centavosDivision,disponiblePagador} from '../services/divisionesService';
import {listarPagosDivision,pagoDivisionBody,nuevoIdPago,registrarPagoDivision,verificarPago,metodosPago,estadoPago} from '../services/pagosService';
import DivisionResumen from './DivisionResumen';
import OperacionRemoteState from './OperacionRemoteState';
import './PagosDivision.css';

const key=(division,persona)=>`dondejuanca_pago_${division}_${persona}`;
function leer(division,persona){try{const body=JSON.parse(sessionStorage.getItem(key(division,persona)));return body?.sesion_division_id===division&&body.participante_id===persona&&typeof body.id==='string'?body:null;}catch{return null;}}
function persistir(division,persona,body){try{if(body)sessionStorage.setItem(key(division,persona),JSON.stringify(body));else sessionStorage.removeItem(key(division,persona));}catch{/* El ID continúa protegido en memoria y por la PK backend. */}}

export function PagoCliente({persona,data,pedidoId,productosIds=[],pedidoAbierto=true,bloqueado=false,pagos=[],loading,errorLectura,onChanged}){
 const {user}=useAuth();
 const [restored]=useState(()=>leer(data.sesion.id,persona.id));
 const attempt=useRef(restored),lock=useRef(false);
 const [pending,setPending]=useState(restored),[open,setOpen]=useState(Boolean(restored)),[form,setForm]=useState({valor:'',metodo:'efectivo'});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[decision,setDecision]=useState(null);
 const saldo=disponiblePagador(persona);
 const scope=data.modalidad==='items'?Boolean(persona.items?.length&&persona.items.every(i=>productosIds.includes(i.pedido_item_id))):data.sesion.pedido_id===pedidoId;
 const editable=pedidoAbierto&&!bloqueado&&data.estado==='activa'&&!data.desactualizada&&scope&&can(user,'pagos.crear');
 const canStart=editable&&centavosDivision(saldo)>0n&&!loading&&!errorLectura;
 let validation='';if(form.valor){try{pagoDivisionBody(form,persona,data,pedidoId,'validacion');}catch(e){validation=e.message;}}
 const save=body=>{attempt.current=body;setPending(body);persistir(data.sesion.id,persona.id,body);};
 async function submit(e){
  e.preventDefault();if(lock.current||!editable)return;lock.current=true;setBusy(true);setError('');setSuccess('');
  try{
   if(!attempt.current)save(pagoDivisionBody(form,persona,data,pedidoId,nuevoIdPago()));
   const result=await registrarPagoDivision(attempt.current);
   save(null);setOpen(false);setForm({valor:'',metodo:'efectivo'});
   setSuccess(result.verificacion_estado==='pendiente'?'Pago registrado. Pendiente de verificación.':result.verificacion_estado==='verificado'?'Pago verificado.':'Pago rechazado.');
   await onChanged();
  }catch(e){setError(e.message);if([400,403,404,409].includes(e.status))save(null);await onChanged();}
  finally{setBusy(false);lock.current=false;}
 }
 async function decide(){
  if(lock.current||!can(user,'pagos.verificar')||!decision)return;lock.current=true;setBusy(true);setError('');setSuccess('');
  try{
   const result=await verificarPago(decision.pago.id,decision.estado);
   setDecision(null);await onChanged();
   const l=result.liquidacion;
   const mensajes=[decision.estado==='verificado'?'Pago verificado.':'Pago rechazado.'];
   if(l?.cuenta_liquidada)mensajes.push('Cuenta pagada.');
   if(l?.division?.estado==='completada')mensajes.push('División completada.');
   if(l?.estado_pedido==='cerrado')mensajes.push('Pedido cerrado.');
   if(l?.estado_mesa==='disponible')mensajes.push('Mesa disponible.');
   else if(l?.motivo_no_liberacion)mensajes.push(l.motivo_no_liberacion);
   if(l?.division?.motivo)mensajes.push(l.division.motivo);
   setSuccess(mensajes.join(' '));
  }
  catch(e){setError(e.message);await onChanged();}finally{setBusy(false);lock.current=false;}
 }
 return <div className="pagos-cliente">
  <h4>Pagos</h4>
  {!loading&&!errorLectura&&!pagos.length&&<p>Aún no hay pagos para este cliente.</p>}
  {pagos.map(p=><div className="pago-historia" key={p.id}><p><strong>{formatCurrency(p.total_seleccionado)}</strong> · {metodosPago[p.metodo_de_pago]} · <span>{estadoPago(p)}</span></p><small>{formatDateTime(p.creado_en)}</small>
   {pedidoAbierto&&data.estado==='activa'&&can(user,'pagos.verificar')&&estadoPago(p)==='Pendiente'&&<div className="operacion-actions"><button className="drawer-secondary-button" disabled={busy||bloqueado||loading||Boolean(errorLectura)||data.desactualizada} onClick={()=>setDecision({pago:p,estado:'verificado'})}>Verificar</button><button className="drawer-secondary-button" disabled={busy||loading||Boolean(errorLectura)} onClick={()=>setDecision({pago:p,estado:'rechazado'})}>Rechazar</button></div>}
  </div>)}
  {canStart&&!open&&<button className="drawer-secondary-button" onClick={()=>{setOpen(true);setError('');setSuccess('');}}>Registrar pago</button>}
  {data.estado==='activa'&&!pedidoAbierto&&<p>Este pedido est? cerrado y no admite nuevos pagos.</p>}
  {pedidoAbierto&&data.estado==='activa'&&!data.desactualizada&&!scope&&can(user,'pagos.crear')&&<p>Abre el pedido de estos productos para registrar el pago.</p>}
  {open&&editable&&<form className="catalogo-form pago-form" onSubmit={submit}><p>Saldo por pagar: <strong>{formatCurrency(saldo)}</strong></p>
   <fieldset disabled={busy||Boolean(pending)||loading||Boolean(errorLectura)}>
    <label>Valor<input type="text" inputMode="decimal" placeholder="10.000" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} required/></label>
    <label>Método de pago<select value={form.metodo} onChange={e=>setForm({...form,metodo:e.target.value})}>{Object.entries(metodosPago).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   </fieldset>
   {!pending&&validation&&<p role="alert">{validation}</p>}
   {pending&&!busy&&<p>La respuesta no se pudo confirmar. Reintenta el mismo pago para comprobarlo sin duplicarlo.</p>}
   <div className="operacion-actions"><button className="drawer-primary-button" type="submit" disabled={busy||loading||Boolean(errorLectura)||!pending&&(!form.valor||Boolean(validation))}>{busy?'Procesando...':pending?'Reintentar pago':'Registrar pago'}</button><button className="drawer-secondary-button" type="button" disabled={busy||Boolean(pending)} onClick={()=>setOpen(false)}>Cancelar</button></div>
  </form>}
  {decision&&pedidoAbierto&&data.estado==='activa'&&can(user,'pagos.verificar')&&<div className="division-aviso" role="alert"><p>¿{decision.estado==='verificado'?'Verificar':'Rechazar'} este pago de {formatCurrency(decision.pago.total_seleccionado)}?</p><div className="operacion-actions"><button className="drawer-primary-button" disabled={busy||bloqueado||decision.estado==='verificado'&&data.desactualizada} onClick={decide}>Confirmar</button><button className="drawer-secondary-button" disabled={busy} onClick={()=>setDecision(null)}>Volver</button></div></div>}
  {busy&&<p role="status">Procesando pago...</p>}{error&&<p role="alert" className="division-error">{error}</p>}{success&&<p role="status" className="pedido-feedback">{success}</p>}
 </div>;
}

export default function PagosDivision({data,pedidoId,productosIds,pedidoAbierto=true,bloqueado=false,onChanged}){
 const {user}=useAuth();
 const pagos=useRemoteCatalog(useCallback(options=>can(user,'pagos.division.ver')?listarPagosDivision(data.sesion.id,options):Promise.resolve([]),[data,user]));
 async function refresh(){await Promise.all([pagos.refresh(),onChanged()]);}
 const otros=(pagos.data||[]).filter(row=>!data.participantes.some(p=>p.id===row.participante_id));
 return <><OperacionRemoteState resource={pagos}/><DivisionResumen data={data} renderPagos={p=><PagoCliente key={p.id} persona={p} data={data} pedidoId={pedidoId} pedidoAbierto={pedidoAbierto} bloqueado={bloqueado} productosIds={productosIds} pagos={(pagos.data||[]).filter(row=>row.participante_id===p.id)} loading={pagos.loading} errorLectura={pagos.error} onChanged={refresh}/>}/>
  {!!otros.length&&<section className="pagos-cliente"><h4>Otros pagos de esta cuenta</h4>{otros.map(p=><p key={p.id}>{formatCurrency(p.total_seleccionado)} · {metodosPago[p.metodo_de_pago]} · {estadoPago(p)}</p>)}</section>}
 </>;
}
