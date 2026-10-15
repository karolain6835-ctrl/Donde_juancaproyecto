import {useCallback,useRef,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog} from '../hooks/useRemoteCatalog';
import {contextoDivision,centavosDivision,decimalDivision} from '../services/divisionesService';
import {metodosPago,nuevoIdPago,pagoDirectoBody,registrarPagoDirecto} from '../services/pagosService';
import {formatCurrency} from '../utils/formatCurrency';
import OperacionRemoteState from './OperacionRemoteState';
export default function PagoDirectoPedido({pedidoId,version,onDivision,onChanged}){
 const {user}=useAuth();
 const resource=useRemoteCatalog(useCallback(options=>contextoDivision(version?.id??pedidoId,options),[pedidoId,version]));
 const [open,setOpen]=useState(false),[form,setForm]=useState({valor:'',metodo:'efectivo'});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const [pending,setPending]=useState(false);
 const lock=useRef(false),attempt=useRef(null);
 const data=resource.data;
 const activa=data?.divisiones.some(d=>d.estado==='activa');
 const disponible=data?centavosDivision(data.saldo)-centavosDivision(data.pendiente_verificacion):0n;
 const editable=can(user,'pagos.crear')&&data?.pedido.estado==='abierto'&&disponible>0n&&!activa;
 let validation='';if(data&&form.valor){try{pagoDirectoBody(form,data,'validacion');}catch(e){validation=e.message;}}
 async function refresh(){await Promise.all([resource.refresh(),onChanged()]);}
 async function submit(e){
  e.preventDefault();if(lock.current||!editable)return;
  lock.current=true;setBusy(true);setError('');setSuccess('');
  try{
   if(!attempt.current){attempt.current=pagoDirectoBody(form,data,nuevoIdPago());setPending(true);}
   await registrarPagoDirecto(attempt.current);attempt.current=null;setPending(false);
   await refresh();setOpen(false);setForm({valor:'',metodo:'efectivo'});setSuccess('Pago registrado. Pendiente de verificación.');
  }catch(e){setError(e.message);if([400,403,404].includes(e.status)||e.status===409&&!/ya existe|registro existente/i.test(e.message)){attempt.current=null;setPending(false);}await refresh();}
  finally{setBusy(false);lock.current=false;}
 }
 return <section className="pago-directo"><OperacionRemoteState resource={resource}>
  {data&&<><p>Total pendiente: <strong>{formatCurrency(data.saldo)}</strong></p>
   {centavosDivision(data.pendiente_verificacion)>0n&&<><p>Pendiente de verificación: {formatCurrency(data.pendiente_verificacion)}</p><p>Disponible para pagar: <strong>{formatCurrency(decimalDivision(disponible>0n?disponible:0n))}</strong></p></>}
   <div className="operacion-actions">
    {can(user,'pagos.crear')&&data.pedido.estado==='abierto'&&centavosDivision(data.saldo)>0n&&<button className="drawer-primary-button" disabled={busy||activa||disponible<=0n} onClick={()=>setOpen(true)}>Pagar</button>}
    {can(user,'divisiones.crear')&&<button className="drawer-secondary-button" disabled={busy} onClick={onDivision}>{activa?'Ver división':'Dividir cuenta'}</button>}
   </div>
   {activa&&<p>Esta cuenta tiene una división activa. Registra los pagos desde la división.</p>}
   {open&&editable&&<form className="catalogo-form" onSubmit={submit}><h4>Pagar pedido</h4><p>Saldo pendiente: {formatCurrency(data.saldo)}</p><fieldset disabled={busy||Boolean(pending)}>
    <label>Valor<input type="text" inputMode="decimal" placeholder="50.000" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} required/></label>
    <label>Método de pago<select value={form.metodo} onChange={e=>setForm({...form,metodo:e.target.value})}>{Object.entries(metodosPago).map(([v,t])=><option value={v} key={v}>{t}</option>)}</select></label>
   </fieldset>{validation&&<p role="alert">{validation}</p>}<div className="operacion-actions"><button className="drawer-primary-button" disabled={busy||!pending&&(!form.valor||Boolean(validation))} type="submit">{busy?'Procesando...':pending?'Reintentar pago':'Registrar pago'}</button><button className="drawer-secondary-button" type="button" disabled={busy||Boolean(pending)} onClick={()=>setOpen(false)}>Cancelar</button></div></form>}
  </>}
 </OperacionRemoteState>{error&&<p role="alert">{error}</p>}{success&&<p role="status">{success}</p>}</section>;
}
