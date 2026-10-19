import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { useCatalogMutation } from '../hooks/useRemoteCatalog';
import { guardarNumeroMesa } from '../services/mesasService';
import { sincronizarOperacion } from '../services/operacionContract';
import './CatalogoForm.css';
import './OperacionForms.css';
export default function MesaForm({ mesa, onClose, onSaved }) {
  const { user } = useAuth();
  const [numero, setNumero] = useState(mesa ? String(mesa.numero) : '');
  const mutation = useCatalogMutation();
  const allowed = can(user, mesa ? 'mesas.editarNumero' : 'mesas.crear');
  function submit(e) {
    e.preventDefault(); if (!allowed) return;
    return mutation.run(() => sincronizarOperacion(() => guardarNumeroMesa({ numero }, mesa?.id), [onSaved]), onClose, 'Mesa guardada.');
  }
  if (!allowed) return null;
  return <>
    <div className="mesa-overlay" onClick={() => { if (!mutation.busy) onClose(); }} />
    <aside className="mesa-drawer" role="dialog" aria-modal="true" aria-label={mesa ? 'Cambiar número de mesa' : 'Nueva mesa'}>
      <div className="mesa-drawer-header"><h2>{mesa ? 'Cambiar número de mesa' : 'Nueva mesa'}</h2><button className="drawer-close" disabled={mutation.busy} onClick={onClose} aria-label="Cerrar formulario">×</button></div>
      <form className="catalogo-form operacion-form" onSubmit={submit}><fieldset disabled={mutation.busy}>
        <label>Número de mesa<input type="number" min="1" max="2147483647" step="1" value={numero} onChange={e => setNumero(e.target.value)} required /></label>
        {!mesa && <p>La nueva mesa estará disponible.</p>}
        {mesa && <p>Se conserva la cuenta y el estado actual de la mesa.</p>}
        {mutation.error && <p role="alert">{mutation.error}</p>}
        <button className="drawer-primary-button" type="submit" disabled={!numero}>{mutation.busy ? 'Guardando...' : 'Guardar mesa'}</button>
      </fieldset></form>
    </aside>
  </>;
}
