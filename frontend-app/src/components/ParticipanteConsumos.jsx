import { useCallback } from 'react';
import { useRemoteCatalog } from '../hooks/useRemoteCatalog';
import { consumosParticipante } from '../services/participantesService';
import { formatCurrency } from '../utils/formatCurrency';
import OperacionRemoteState from './OperacionRemoteState';
export default function ParticipanteConsumos({ persona, onClose }) {
  const resource = useRemoteCatalog(useCallback(options => consumosParticipante(persona.sesion_mesa_id, persona.id, options), [persona.id, persona.sesion_mesa_id]));
  return <section className="operacion-drawer-section"><h4>Consumos de {persona.nombre}</h4>
    <button type="button" className="drawer-secondary-button" onClick={onClose}>Cerrar consumos</button>
    <OperacionRemoteState resource={resource}>{resource.data && <>
      {resource.data.resumen_productos.map(row => <div className="operacion-item" key={row.productos_id}><strong>{row.producto}</strong><p>Cantidad total: {row.cantidad_total}</p><p>Subtotal: {formatCurrency(row.subtotal_total)}</p></div>)}
      {!resource.data.items.length && <p>Aún no tiene consumos en esta visita.</p>}
      <p>Total consumido: {formatCurrency(resource.data.total_consumido)}</p>
      <small>Consumos de la visita; no representa el saldo pendiente de pago.</small>
    </>}</OperacionRemoteState>
  </section>;
}
