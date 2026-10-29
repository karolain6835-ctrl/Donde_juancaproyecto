import {useCallback,useRef,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog,useCatalogMutation} from '../hooks/useRemoteCatalog';
import {liquidacionJuego} from '../services/juegosService';
import {apiClient} from '../services/apiClient';
import {nuevoIdPago,metodosPago,verificarPago,estadoPago} from '../services/pagosService';
import {montoCOP,centavosDivision,decimalDivision} from '../services/divisionesService';
import {formatCurrency} from '../utils/formatCurrency';
import ModalOperacion from './ModalOperacion';
import OperacionRemoteState from './OperacionRemoteState';

export default function JuegoPagoForm({sesion,onChanged,onClose}){
 const {user}=useAuth();
 const resource=useRemoteCatalog(useCallback(options=>liquidacionJuego(sesion.id,options),[sesion.id]));
 const mutation=useCatalogMutation(),intento=useRef(null);
 const [valor,setValor]=useState(''),[metodo,setMetodo]=useState('efectivo');
 if(!can(user,'pagos.crear'))return null;
 const q=resource.data;
 async function refresh(){await Promise.all([resource.refresh(),onChanged()]);}
 async function submit(e){e.preventDefault();if(!q||!q.total_definitivo)return;
  await mutation.run(async()=>{
   const importe=montoCOP(valor);
   if(importe<=0n||importe>centavosDivision(q.disponible))throw new Error('El importe debe ser positivo y no superar el saldo disponible.');
   if(!intento.current)intento.current=nuevoIdPago();
   const r=await apiClient('/pagos',{method:'POST',body:{id:intento.current,sesiones_juego_id:sesion.id,metodo_de_pago:metodo,total_seleccionado:decimalDivision(importe)}});
   if(r.id_pago!==intento.current)throw new Error('No se pudo confirmar el pago. Consulta su estado antes de reintentar.');
   intento.current=null;setValor('');await refresh();
  },async()=>{},'Pago registrado; requiere verificación en Caja.');
 }
 async function verificar(id,decision){await mutation.run(async()=>{const r=await verificarPago(id,decision);await refresh();if(r.liquidacion?.cuenta_liquidada)onClose();},async()=>{},decision==='verificado'?'Pago verificado.':'Pago rechazado.');}
 return <ModalOperacion title="Cobrar juego sin pedido" busy={mutation.busy} onClose={onClose}><p>{sesion.activo_nombre} · Mesa {sesion.mesa_numero}</p><OperacionRemoteState resource={resource}>{q&&<><dl className="juegos-detail-grid">{[['Total',q.total_cuenta],['Pagado',q.total_pagado],['Saldo',q.saldo_pendiente],['Pendiente de verificación',q.pagos_pendientes_verificacion]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{formatCurrency(value)}</dd></div>)}</dl><form className="catalogo-form" onSubmit={submit}><fieldset disabled={mutation.busy||!q.total_definitivo||centavosDivision(q.disponible)===0n}><label>Importe (COP)<input type="text" inputMode="decimal" required value={valor} onChange={e=>setValor(e.target.value)}/></label><label>Método<select value={metodo} onChange={e=>setMetodo(e.target.value)}>{Object.entries(metodosPago).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button className="drawer-primary-button" type="submit">Registrar pago</button></fieldset></form>{q.pagos.map(p=><div key={p.id}><p>{metodosPago[p.metodo_de_pago]} · {formatCurrency(p.total_seleccionado)} · {estadoPago(p)}</p>{can(user,'pagos.verificar')&&p.estado==='pendiente'&&p.verificacion_estado==='pendiente'&&<div className="operacion-actions"><button className="drawer-primary-button" disabled={mutation.busy} onClick={()=>verificar(p.id,'verificado')}>Verificar pago</button><button className="drawer-secondary-button" disabled={mutation.busy} onClick={()=>verificar(p.id,'rechazado')}>Rechazar pago</button></div>}</div>)}</>}</OperacionRemoteState>{mutation.error&&<p role="alert">{mutation.error}</p>}{mutation.success&&<p role="status">{mutation.success}</p>}</ModalOperacion>;
}
