import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { formatDateTime } from '../utils/dateTime';
import { useRemoteCatalog } from '../hooks/useRemoteCatalog';
import { listarRondas, baseRonda, rondaBody, confirmarRonda } from '../services/rondasConsumoService';
import { listarProductos } from '../services/productosService';
import { listarParticipantesMesa, agregarParticipanteMesa, listarParticipantes, agregarParticipante } from '../services/participantesService';
import PedidoParticipantes from './PedidoParticipantes';
import OperacionRemoteState from './OperacionRemoteState';
const nuevaLinea=()=>({ participante_id:'',productos_id:'',cantidad:'1' });
function Borrador({ sesionId,mesaId,pedidoId,inicial,onConfirmed,onCancel }) {
  const [lines,setLines]=useState(()=>inicial || [nuevaLinea()]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[frozen,setFrozen]=useState(false);
  const attempt=useRef(null),lock=useRef(false);
  const catalog=useRemoteCatalog(useCallback(async options=>{
    if (!sesionId) {
      const [productos,participantes]=await Promise.all([listarProductos(options),listarParticipantes(pedidoId,options)]);
      return { productos,participantes };
    }
    const [productos,visita]=await Promise.all([listarProductos(options),listarParticipantesMesa(mesaId,options)]);
    if(visita.sesion?.id!==sesionId)throw new Error('La visita activa cambió. Abre nuevamente el detalle.');
    return { productos,participantes:visita.datos };
  },[mesaId,sesionId,pedidoId]));
  function change(index,key,value){setLines(lines.map((line,i)=>i===index?{ ...line,[key]:value }:line));}
  async function confirm(e){
    e.preventDefault();if(lock.current)return;lock.current=true;setError('');
    try{
      if(!attempt.current)attempt.current={ key:crypto.randomUUID(),body:rondaBody(lines,catalog.data) };
      setFrozen(true);setBusy(true);
      await confirmarRonda(pedidoId,attempt.current.body,attempt.current.key);
      await onConfirmed();
    }catch(e){
      setError(e.message);
      // Errores de validación definitivos no han confirmado. Error de red/500:
      // conservar exactamente cuerpo y clave para reintentar sin doble salida.
      const conservar=['CONFLICTO_CONCURRENTE','CAMBIO_CONCURRENTE','IDEMPOTENCIA_DISTINTA'].includes(e.data?.codigo);
      if([400,403,404,409].includes(e.status) && !conservar){attempt.current=null;setFrozen(false);}
      if(e.status===400 && /stock/i.test(e.message))await catalog.refresh();
    }finally{setBusy(false);lock.current=false;}
  }
  return <section className="ronda-borrador"><h4>Ronda</h4><p>Revisa los productos antes de confirmar.</p>
    <OperacionRemoteState resource={catalog} />
    {catalog.data && <>
      {!frozen && <PedidoParticipantes resource={{ ...catalog,data:catalog.data.participantes }} titulo={sesionId ? 'Clientes en la mesa' : 'Clientes del pedido'} agregar={person=>sesionId ? agregarParticipanteMesa(mesaId,person) : agregarParticipante(pedidoId,person)} editable />}
      <form className="catalogo-form operacion-form" onSubmit={confirm}><fieldset disabled={busy || frozen || catalog.loading || Boolean(catalog.error)}>
        {lines.map((line,index)=><div className="operacion-item ronda-draft-line" key={index}>
          <label>Cliente<select value={line.participante_id} onChange={e=>change(index,'participante_id',e.target.value)} required><option value="">Selecciona una persona</option>{catalog.data.participantes.map(p=><option key={p.id} value={p.id}>{p.nombre} — {p.tipo_participante==='temporal'?'Temporal':'Registrado'}</option>)}</select></label>
          <label>Producto<select value={line.productos_id} onChange={e=>change(index,'productos_id',e.target.value)} required><option value="">Selecciona un producto</option>{catalog.data.productos.filter(p=>p.activo).map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nombre} — Stock: {p.stock}</option>)}</select></label>
          <label>Cantidad<input type="number" min="1" max="2147483647" step="1" value={line.cantidad} onChange={e=>change(index,'cantidad',e.target.value)} required /></label>
          <button type="button" className="drawer-secondary-button" onClick={()=>setLines(lines.filter((_,i)=>i!==index))}>Eliminar producto</button>
        </div>)}
        <button type="button" className="drawer-secondary-button" disabled={lines.length>=100} onClick={()=>setLines([...lines,nuevaLinea()])}>Agregar producto</button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {frozen && <p>La solicitud conserva sus datos para un reintento seguro con la misma clave.</p>}
      <div className="operacion-actions"><button type="submit" className="drawer-primary-button" disabled={busy || catalog.loading || Boolean(catalog.error) || !lines.length}>{busy?'Confirmando...':frozen?'Reintentar confirmación':'Confirmar ronda'}</button><button type="button" className="drawer-secondary-button" disabled={busy || frozen} onClick={onCancel}>Cancelar</button></div>
      </form>
    </>}
  </section>;
}
export default function RondasConsumo({ sesionId,mesaId,pedidoId,onChanged,version,editable=true }) {
  const { user }=useAuth();
  const resource=useRemoteCatalog(useCallback(options=>{
    if(version?.sesion_mesa_id && version.sesion_mesa_id!==sesionId)throw new Error('El pedido cambió de visita. Abre nuevamente el detalle.');
    return listarRondas(pedidoId,options).catch(error=>{
      if (!options?.signal?.aborted) console.error('Error al cargar rondas del pedido',pedidoId,error);
      throw error;
    });
  },[pedidoId,sesionId,version]));
  const [draft,setDraft]=useState(null),[success,setSuccess]=useState('');
  const base=baseRonda(resource.data || [],version?.items || []);
  const puedeRepetir=editable && can(user,'pedidos.agregarItems') && !resource.loading && !resource.error && base.length>0;
  if (!resource.loading && !resource.error && !resource.data?.length && !puedeRepetir && !draft && !success) return null;
  return <section className="operacion-drawer-section"><div className="operacion-actions"><h3>Rondas de consumo</h3>
    {puedeRepetir && !draft && <button className="drawer-secondary-button" onClick={()=>{setSuccess('');setDraft({ lines:base });}}>Ronda</button>}</div>
    {resource.error ? <div role="alert"><p>No fue posible cargar las rondas.</p><p>{resource.error}</p><button className="drawer-secondary-button" onClick={resource.refresh}>Reintentar</button></div> : <OperacionRemoteState resource={resource} />}
    {(resource.data || []).map(r=><article className="operacion-item" key={r.id}><strong>Ronda {r.numero_ronda}</strong><p>{formatDateTime(r.creada_en)} — {r.estado}</p>
      {r.items.map(i=><p key={i.id}>{i.participante_nombre || 'Sin asignar'} — {i.producto} × {i.cantidad_pedida}{i.estado==='cancelado'?' — Cancelado':''}</p>)}
    </article>)}
    {draft && <Borrador key={pedidoId} sesionId={sesionId} mesaId={mesaId} pedidoId={pedidoId} inicial={draft.lines} onCancel={()=>setDraft(null)} onConfirmed={async()=>{setDraft(null);setSuccess('Ronda confirmada correctamente.');await Promise.all([resource.refresh(),onChanged()]);}} />}
    {success && <p className="pedido-feedback" role="status">{success}</p>}
  </section>;
}
