import { useState } from 'react';
import { useCatalogMutation } from '../hooks/useRemoteCatalog';
import { agregarParticipante } from '../services/participantesService';
import ClientePedidoFields from './ClientePedidoFields';
import OperacionRemoteState from './OperacionRemoteState';
export default function PedidoParticipantes({ id, resource, editable }) {
  const [person, setPerson] = useState(null);
  const mutation = useCatalogMutation();
  function add(e) {
    e.preventDefault();
    if (!person || !editable) return;
    return mutation.run(() => agregarParticipante(id, person), async () => { await resource.refresh(); setPerson(null); }, 'Participante agregado.');
  }
  return <section className="operacion-drawer-section"><h3>Participantes del pedido</h3>
    <OperacionRemoteState resource={resource} />
    <ul className="pedido-participantes">{(resource.data || []).map(p => <li key={p.id}><strong>{p.nombre}</strong><small>{p.tipo_participante === 'temporal' ? 'Temporal' : 'Cliente registrado'}</small></li>)}</ul>
    {!resource.loading && !resource.error && !resource.data?.length && <p>Este pedido aún no tiene participantes asociados.</p>}
    {editable && <details><summary>+ Agregar participante</summary><form className="catalogo-form operacion-form" onSubmit={add}>
      <ClientePedidoFields value={person} onChange={setPerson} disabled={mutation.busy} participante />
      <button className="drawer-secondary-button" disabled={mutation.busy || !person?.nombre?.trim()}>Agregar participante</button>
    </form></details>}
    {mutation.error && <p role="alert">{mutation.error}</p>}{mutation.success && <p role="status">{mutation.success}</p>}
  </section>;
}
