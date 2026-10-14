import { useCallback, useState } from 'react';
import { UserRound } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { useRemoteCatalog, useCatalogMutation } from '../hooks/useRemoteCatalog';
import ClientePedidoFields from './ClientePedidoFields';
import { listarResponsables } from '../services/usuariosService';
import { crearPedido } from '../services/pedidosService';
import OperacionRemoteState from './OperacionRemoteState';
import './CatalogoForm.css';
import './OperacionForms.css';

export default function PedidoForm({ mesas, initialMesa = '', onClose, onCreated }) {
  const { user } = useAuth();
  const assignable = can(user, 'pedidos.asignarResponsable');
  const [form, setForm] = useState({ mesas_id: initialMesa, usuarios_id: '' });
  const responsableId = assignable ? form.usuarios_id : user?.id;
  const [participant, setParticipant] = useState(null);
  const responsibleLoader = useCallback(options => assignable ? listarResponsables(options) : Promise.resolve([]), [assignable]);
  const responsible = useRemoteCatalog(responsibleLoader);
  const mutation = useCatalogMutation();
  const [validation, setValidation] = useState('');
  const ready = !mesas.loading && !mesas.error && (!assignable || (!responsible.loading && !responsible.error));
  // Conservar el ID real confirmado para abrir el detalle después de la reconsulta.
  function submit(event) {
    event.preventDefault(); setValidation('');
    if (!can(user, 'pedidos.crear') || !ready) return;
    if (!mesas.data?.some(m => m.id === form.mesas_id) || !participant?.nombre?.trim() || !responsableId || (assignable && !responsible.data?.some(u => u.id === responsableId && u.estado === 'activo'))) {
      setValidation('Selecciona una mesa, un participante y un responsable reales.'); return;
    }
    let result;
    return mutation.run(async () => { result = await crearPedido({ ...form, usuarios_id: responsableId, clientes_id: participant.tipo_participante === 'registrado' ? participant.clientes_id : null, ...(participant.tipo_participante === 'temporal' ? { participante_temporal: { nombre: participant.nombre } } : {}) }); }, async () => { await onCreated(result.id_pedido); }, 'Pedido creado correctamente.');
  }
  return <>
    <div className="pedido-overlay" onClick={() => { if (!mutation.busy) onClose(); }} />
    <aside className="pedido-drawer" role="dialog" aria-modal="true" aria-label="Nuevo pedido">
      <div className="pedido-drawer-header"><h2>Nuevo pedido</h2><button className="drawer-close" disabled={mutation.busy} onClick={onClose} aria-label="Cerrar formulario">×</button></div>
      {[mesas, ...(assignable ? [responsible] : [])].map((resource, index) => <OperacionRemoteState key={index} resource={resource} />)}
      <form className="catalogo-form operacion-form" onSubmit={submit}><fieldset disabled={mutation.busy}>
        <label>Mesa<select value={form.mesas_id} onChange={event => setForm({ ...form, mesas_id: event.target.value })} disabled={mesas.loading || Boolean(mesas.error)} required><option value="">Selecciona una mesa</option>{(mesas.data || []).map(m => <option key={m.id} value={m.id}>Mesa {m.numero} — {m.estado}</option>)}</select></label>
        <ClientePedidoFields value={participant} onChange={setParticipant} disabled={mutation.busy} />
        {assignable ? <label>Responsable del pedido<select value={form.usuarios_id} onChange={event => setForm({ ...form, usuarios_id: event.target.value })} disabled={responsible.loading || Boolean(responsible.error)} required><option value="">Selecciona un responsable</option>{(responsible.data || []).map(u => <option key={u.id} value={u.id}>{u.nombre || u.id}</option>)}</select></label> : <div className="pedido-responsable-block"><p className="pedido-responsable-label">Responsable del pedido</p><div className="pedido-responsable-card"><span className="pedido-responsable-avatar" aria-hidden="true"><UserRound size={20} /></span><div className="pedido-responsable-identity"><strong>{user?.nombre || user?.id}</strong><span>Asignado automáticamente</span></div></div></div>}
        {assignable && !responsible.loading && !responsible.error && !responsible.data?.length && <p>No hay responsables activos disponibles.</p>}
        {(validation || mutation.error) && <p role="alert">{validation || mutation.error}</p>}
        <button className="drawer-primary-button" type="submit" disabled={!ready || !form.mesas_id || !participant?.nombre?.trim() || !responsableId}>{mutation.busy ? 'Guardando...' : 'Crear pedido'}</button>
        <small className="pedido-session-note">El pedido quedará registrado con tu sesión.</small>
      </fieldset></form>
    </aside>
  </>;
}
