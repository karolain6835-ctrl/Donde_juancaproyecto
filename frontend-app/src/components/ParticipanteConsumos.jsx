import { useCallback } from 'react';
import { useRemoteCatalog } from '../hooks/useRemoteCatalog';
import { consumosParticipante } from '../services/participantesService';
import { formatCurrency } from '../utils/formatCurrency';
import OperacionRemoteState from './OperacionRemoteState';
import ProductoImagen from './ProductoImagen';
import './ParticipanteConsumos.css';
export default function ParticipanteConsumos({ persona, onClose, productos = [] }) {
  const resource = useRemoteCatalog(useCallback(options => consumosParticipante(persona.sesion_mesa_id, persona.id, options), [persona.id, persona.sesion_mesa_id]));
  return <section className="operacion-drawer-section cliente-consumos"><header className="cliente-consumos-header"><h4>Consumos de {persona.nombre}</h4>
    <button type="button" className="drawer-secondary-button" onClick={onClose}>Cerrar consumos</button></header>
    <OperacionRemoteState resource={resource}>{resource.data && <>
      <ul className="cliente-consumos-lista" aria-label={`Consumos de ${persona.nombre}`}>{resource.data.resumen_productos.map(row => <li key={row.productos_id}><div className="cliente-consumo-producto"><ProductoImagen url={row.imagen_url || productos.find(p => p.id === row.productos_id)?.imagen_url} nombre={row.producto}/><strong>{row.producto}</strong></div><span className="cliente-consumo-cantidad">Cant. {row.cantidad_total}</span><strong className="cliente-consumo-subtotal">{formatCurrency(row.subtotal_total)}</strong></li>)}</ul>
      {!resource.data.items.length && <p>Aún no tiene consumos en esta visita.</p>}
      <div className="cliente-consumos-total"><strong>Total consumido</strong><strong>{formatCurrency(resource.data.total_consumido)}</strong></div>
      <small>Consumos de la visita; no representa el saldo pendiente de pago.</small>
    </>}</OperacionRemoteState>
  </section>;
}
