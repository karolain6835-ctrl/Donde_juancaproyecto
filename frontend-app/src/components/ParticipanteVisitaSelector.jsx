import { useCallback, useState } from 'react';
import { useRemoteCatalog } from '../hooks/useRemoteCatalog';
import { listarParticipantesMesa } from '../services/participantesService';
function Lista({ mesaId, onSelect, onAdd }) {
  const resource = useRemoteCatalog(useCallback(options => listarParticipantesMesa(mesaId, options), [mesaId]));
  const [open, setOpen] = useState(false);
  if(resource.loading)return <p role="status">Cargando clientes...</p>;
  if(resource.error)return <div role="alert"><p>{resource.error}</p><button type="button" className="drawer-secondary-button" onClick={resource.refresh}>Reintentar</button></div>;
  if(!resource.data?.datos.length)return <div className="pedido-mesa-clientes-vacio"><p>No hay clientes asociados a esta mesa.</p><button type="button" className="drawer-secondary-button" onClick={onAdd}>Agregar cliente</button></div>;
  return <><button type="button" className="drawer-secondary-button" onClick={()=>setOpen(!open)}>Elegir cliente de la mesa</button>
    {open && <label>Cliente de la mesa<select defaultValue="" onChange={e => { const p = resource.data?.datos.find(p => p.id === e.target.value); onSelect(p ? { ...p, participante_id: p.id } : null); }}>
      <option value="">Selecciona un cliente</option>{(resource.data?.datos || []).map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.tipo_participante === 'temporal' ? 'Temporal' : 'Registrado'}</option>)}
    </select></label>}
  </>;
}
export default function ParticipanteVisitaSelector({ mesaId, onSelect, onAdd }) {
  return <div>{mesaId&&<Lista key={mesaId} mesaId={mesaId} onSelect={onSelect} onAdd={onAdd}/>}</div>;
}
