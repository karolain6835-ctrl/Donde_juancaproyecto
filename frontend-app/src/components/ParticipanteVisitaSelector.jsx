import { useCallback, useState } from 'react';
import { useRemoteCatalog } from '../hooks/useRemoteCatalog';
import { listarParticipantesMesa } from '../services/participantesService';
function Lista({ mesaId, onSelect }) {
  const resource = useRemoteCatalog(useCallback(options => listarParticipantesMesa(mesaId, options), [mesaId]));
  return <>{resource.loading && <p role="status">Cargando participantes...</p>}
    {resource.error && <div role="alert"><p>{resource.error}</p><button type="button" className="drawer-secondary-button" onClick={resource.refresh}>Reintentar</button></div>}
    <label>Participante de la visita<select defaultValue="" disabled={resource.loading || Boolean(resource.error)} onChange={e => { const p = resource.data?.datos.find(p => p.id === e.target.value); onSelect(p ? { ...p, participante_id: p.id } : null); }}>
      <option value="">Selecciona un participante</option>{(resource.data?.datos || []).map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.tipo_participante === 'temporal' ? 'Temporal' : 'Registrado'}</option>)}
    </select></label>
    {!resource.loading && !resource.error && !resource.data?.datos.length && <p>No hay participantes en la visita actual.</p>}
  </>;
}
export default function ParticipanteVisitaSelector({ mesaId, onSelect }) {
  const [open, setOpen] = useState(false);
  return <div><button type="button" className="drawer-secondary-button" disabled={!mesaId} onClick={() => setOpen(!open)}>Usar participante de la visita</button>
    {open && <Lista key={mesaId} mesaId={mesaId} onSelect={onSelect} />}
  </div>;
}
