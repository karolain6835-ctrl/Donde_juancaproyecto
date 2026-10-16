import {useCallback,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog,useCatalogMutation} from '../hooks/useRemoteCatalog';
import {listarPedidos} from '../services/pedidosService';
import {inicioJuegoBody,iniciarJuego} from '../services/juegosService';
import {formatCurrency} from '../utils/formatCurrency';
import {formatDateTime} from '../utils/dateTime';
import OperacionRemoteState from './OperacionRemoteState';
export default function JuegoInicioForm({activo,mesas,bloqueado,onChanged,onCancel}){
 const {user}=useAuth();
 const [mesaId,setMesaId]=useState(''),[pedidoId,setPedidoId]=useState(''),[pagina,setPagina]=useState(1);
 const orders=useRemoteCatalog(useCallback(options=>mesaId?listarPedidos({estado:'abierto',mesas_id:mesaId,pagina,limite:20},options):Promise.resolve({datos:[]}),[mesaId,pagina]));
 const mutation=useCatalogMutation();
 if(!can(user,'juegos.iniciar'))return null;
 const pedido=orders.data?.datos.find(p=>p.id===pedidoId);
 async function submit(e){e.preventDefault();if(!pedido||orders.loading||orders.error||bloqueado)return;await mutation.run(async()=>{const body=inicioJuegoBody(activo,mesaId,pedido,mesas.data||[]);const result=await iniciarJuego(body);await onChanged(result);},onCancel,'Juego iniciado.');}
 return <section className="juegos-start-panel" aria-labelledby="juego-inicio-titulo"><div className="juegos-section-heading"><h2 id="juego-inicio-titulo">Iniciar juego</h2><p>Selecciona la mesa y el pedido que recibirá el cargo.</p></div><div className="juegos-selected-asset"><span>Juego</span><strong>{activo.nombre}</strong><small>Tarifa por hora: {formatCurrency(activo.precio_hora)}</small></div><form className="juegos-start-form" onSubmit={submit}><fieldset disabled={mutation.busy||bloqueado||mesas.loading||Boolean(mesas.error)}>
  <label>Mesa<select value={mesaId} required onChange={e=>{setMesaId(e.target.value);setPedidoId('');setPagina(1);}}><option value="">Selecciona una mesa</option>{(mesas.data||[]).map(m=><option key={m.id} value={m.id}>Mesa {m.numero}</option>)}</select></label>
  {mesaId&&<OperacionRemoteState resource={orders} empty="No hay pedidos abiertos en esta mesa."><label>Pedido abierto<select required value={pedidoId} onChange={e=>setPedidoId(e.target.value)}><option value="">Selecciona un pedido</option>{(orders.data?.datos||[]).filter(p=>p.estado==='abierto'&&p.mesas_id===mesaId).map(p=><option key={p.id} value={p.id}>{p.cliente_nombre||'Sin cliente registrado'} · {formatDateTime(p.creado_en)} · {p.id.slice(0,8)}</option>)}</select></label></OperacionRemoteState>}
  {orders.data?.paginacion&&<div className="operacion-actions"><button type="button" disabled={orders.loading||pagina<=1} onClick={()=>{setPagina(pagina-1);setPedidoId('');}}>Anterior</button><span>Página {pagina}</span><button type="button" disabled={orders.loading||pagina>=orders.data.paginacion.total_paginas} onClick={()=>{setPagina(pagina+1);setPedidoId('');}}>Siguiente</button></div>}
  <div className="operacion-actions juegos-form-actions"><button className="drawer-secondary-button" type="button" onClick={onCancel}>Cancelar</button><button className="drawer-primary-button" disabled={!pedido||orders.loading||Boolean(orders.error)} type="submit">{mutation.busy?'Iniciando...':'Iniciar juego'}</button></div>
 </fieldset></form>{mutation.error&&<div role="alert"><p>{mutation.error}</p><button className="drawer-secondary-button" onClick={orders.refresh}>Actualizar pedidos</button></div>}</section>;
}
