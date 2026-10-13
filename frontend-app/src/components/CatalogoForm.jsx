import { useState } from 'react';
import './CatalogoForm.css';

export default function CatalogoForm({ title, initial, fields, busy, error, onSave, onClose, prefix }) {
  const [form, setForm] = useState(initial);
  const close = () => { if (!busy) onClose(); };
  return <>
    <div className={`${prefix}-overlay`} onClick={close} />
    <aside className={`${prefix}-drawer`} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`${prefix}-drawer-header`}><h2>{title}</h2><button type="button" className="drawer-close" disabled={busy} onClick={close} aria-label="Cerrar formulario">×</button></div>
      <form className="catalogo-form" onSubmit={event => { event.preventDefault(); onSave(form); }}>
        <fieldset disabled={busy}>
          {fields.map(field => <label key={field.name}>{field.label}
            {field.options ? <select value={form[field.name] ?? ''} onChange={event => setForm({ ...form, [field.name]: event.target.value })}>
              {field.options.map(option => <option key={option} value={option}>{option === 'activo' ? 'Activo' : 'Inactivo'}</option>)}
            </select> : <input type={field.type || 'text'} required={field.required} maxLength={field.maxLength} value={form[field.name] ?? ''}
              onChange={event => setForm({ ...form, [field.name]: event.target.value })} />}
          </label>)}
          {error && <p role="alert">{error}</p>}
          <div className="catalogo-actions"><button type="submit" className="drawer-primary-button" disabled={busy}>{busy ? 'Guardando...' : 'Guardar'}</button><button type="button" className="drawer-secondary-button" onClick={close}>Cancelar</button></div>
        </fieldset>
      </form>
    </aside>
  </>;
}
