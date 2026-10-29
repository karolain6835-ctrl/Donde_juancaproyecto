import {useCallback,useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog,useCatalogMutation} from '../hooks/useRemoteCatalog';
import {listarPedidos} from '../services/pedidosService';
import {asociarPedidoJuego} from '../services/juegosService';
import {formatDateTime} from '../utils/dateTime';
import ModalOperacion from './ModalOperacion';
import OperacionRemoteState from './OperacionRemoteState';

export default function JuegoPedidoForm({sesion,onChanged,onClose}){
 const {user}=useAuth();
 const [pedidoId,setPedidoId]=useState(''),[pagina,setPagina]=useState(1);
 const orders=useRemoteCatalog(useCallback(options=>listarPedidos({estado:'abierto',mesas_id:sesion.mesas_id,pagina,limite:20},options),[sesion.mesas_id,pagina]));
 const mutation=useCatalogMutation();
 if(!can(user,'juegos.iniciar'))return null;
 async function submit(e){e.preventDefault();if(!pedidoId||orders.loading||orders.error)return;await mutation.run(async()=>{const result=await asociarPedidoJuego(sesion.id,pedidoId);await onChanged(result);},onClose,'Pedido asociado.');}
 return <ModalOperacion title="Asociar pedido al juego" onClose={onClose} busy={mutation.busy}><form className="catalogo-form" onSubmit={submit}><fieldset disabled={mutation.busy}><p>{sesion.activo_nombre} · Mesa {sesion.mesa_numero}</p><OperacionRemoteState resource={orders} empty="No hay pedidos abiertos. Crea un pedido real en esta mesa si hay consumo."><label>Pedido abierto<select required value={pedidoId} onChange={e=>setPedidoId(e.target.value)}><option value="">Selecciona un pedido</option>{(orders.data?.datos||[]).filter(p=>p.mesas_id===sesion.mesas_id&&p.estado==='abierto').map(p=><option key={p.id} value={p.id}>{p.cliente_nombre||'Sin cliente registrado'} · {formatDateTime(p.creado_en)} · {p.id.slice(0,8)}</option>)}</select></label></OperacionRemoteState>{orders.data?.paginacion&&<div className="operacion-actions"><button type="button" disabled={orders.loading||pagina<=1} onClick={()=>{setPagina(pagina-1);setPedidoId('');}}>Anterior</button><span>Página {pagina}</span><button type="button" disabled={orders.loading||pagina>=orders.data.paginacion.total_paginas} onClick={()=>{setPagina(pagina+1);setPedidoId('');}}>Siguiente</button></div>}{mutation.error&&<p role="alert">{mutation.error}</p>}<button className="drawer-primary-button" disabled={!pedidoId||orders.loading||Boolean(orders.error)} type="submit">{mutation.busy?'Guardando...':'Asociar pedido'}</button></fieldset></form></ModalOperacion>;
}
