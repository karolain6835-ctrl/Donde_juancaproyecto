import { useState } from 'react';
import { useCatalogMutation } from '../hooks/useRemoteCatalog';
import { agregarParticipante } from '../services/participantesService';
import ClientePedidoFields from './ClientePedidoFields';
import OperacionRemoteState from './OperacionRemoteState';
import ParticipanteConsumos from './ParticipanteConsumos';
export default function PedidoParticipantes({ id, resource, editable, agregar, titulo = 'Participantes de la visita' }) {
  const [person, setPerson] = useState(null);
  const [selected, setSelected] = useState(null);
  const mutation = useCatalogMutation();
  function add(e) {
    e.preventDefault();
    if (!person || !editable) return;
    return mutation.run(() => agregar ? agregar(person) : agregarParticipante(id, person), async () => { await resource.refresh(); setPerson(null); }, 'Participante agregado.');
  }
  return <section className="operacion-drawer-section"><h3>{titulo}</h3>
    <OperacionRemoteState resource={resource} />
    <ul className="pedido-participantes">{(resource.data || []).map(p => <li key={p.id}><strong>{p.nombre}</strong><small>{p.tipo_participante === 'temporal' ? 'Temporal' : 'Cliente registrado'}</small>{p.sesion_mesa_id && <button type="button" className="drawer-secondary-button" onClick={() => setSelected(p)}>Ver consumos</button>}</li>)}</ul>
    {!resource.loading && !resource.error && !resource.data?.length && <p>Aún no hay participantes asociados.</p>}
    {selected && <ParticipanteConsumos key={selected.id} persona={selected} onClose={() => setSelected(null)} />}
    {editable && <details><summary>+ Agregar participante</summary><form className="catalogo-form operacion-form" onSubmit={add}>
      <ClientePedidoFields value={person} onChange={setPerson} disabled={mutation.busy} participante />
      <button className="drawer-secondary-button" disabled={mutation.busy || !person?.nombre?.trim()}>Agregar participante</button>
    </form></details>}
    {mutation.error && <p role="alert">{mutation.error}</p>}{mutation.success && <p role="status">{mutation.success}</p>}
  </section>;
}
