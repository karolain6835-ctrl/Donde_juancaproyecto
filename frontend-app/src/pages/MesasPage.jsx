import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Armchair, Plus, Search } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { useRemoteCatalog } from '../hooks/useRemoteCatalog';
import { listarMesas, estadosMesa } from '../services/mesasService';
import OperacionRemoteState from '../components/OperacionRemoteState';
import MesaDetalle from '../components/MesaDetalle';
import PedidoForm from '../components/PedidoForm';
import './MesasPage.css';
import './PedidosPage.css';
import '../components/OperacionForms.css';

export default function MesasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const allowed = can(user, 'mesas.ver');
  const loader = useCallback(options => allowed ? listarMesas(options) : Promise.resolve(null), [allowed]);
  const mesas = useRemoteCatalog(loader);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(null);
  const [estado, setEstado] = useState('');
  const [buscar, setBuscar] = useState('');
  const rows = (mesas.data || []).filter(m => (!estado || m.estado === estado) && `mesa ${m.numero}`.includes(buscar.trim().toLowerCase()));
  if (!allowed) return <p>No tienes permiso para consultar mesas.</p>;
  return <div className="mesas-page">
    <header className="mesas-header"><div><p className="page-eyebrow">OPERACIÓN</p><h1 className="page-title">Mesas</h1><p className="page-description">Consulta el salón y administra las cuentas de las mesas.</p></div>
      {can(user, 'pedidos.crear') && <button className="primary-button" onClick={() => setCreating('')}><Plus size={18} />Nuevo pedido</button>}
    </header>
    <section className="mesas-kpis">{[['', 'Total mesas'], ...Object.entries(estadosMesa)].map(([value, label]) => <button key={value} className={`mesa-kpi ${estado === value ? 'selected' : ''}`} onClick={() => setEstado(value)}><span>{label}</span><strong>{mesas.loading || mesas.error ? '—' : (mesas.data || []).filter(m => !value || m.estado === value).length}</strong></button>)}</section>
    <section className="mesas-toolbar"><div className="mesa-filters">{[['', 'Todas'], ...Object.entries(estadosMesa)].map(([value, label]) => <button key={value} className={`filter-button ${estado === value ? 'active' : ''}`} onClick={() => setEstado(value)}>{label}</button>)}</div><div className="mesa-search"><Search className="mesa-search-icon" size={18} /><input aria-label="Buscar mesa" placeholder="Buscar mesa..." value={buscar} onChange={event => setBuscar(event.target.value)} /></div><button className="drawer-secondary-button" disabled={mesas.loading} onClick={mesas.refresh}>Actualizar</button></section>
    <OperacionRemoteState resource={mesas} empty="No hay mesas para mostrar."><section className="salon-panel"><div className="salon-header"><div><h2>Salón</h2><p>{rows.length} mesas visibles</p></div></div><div className="mesas-grid operacion-mesas-grid">
      {rows.map(m => <button className={`mesa-card ${m.estado}`} key={m.id} onClick={() => setSelectedId(m.id)}><div className="mesa-number"><Armchair size={22} /><strong>{m.numero}</strong></div><div className="mesa-info"><strong>Mesa {m.numero}</strong><span>{estadosMesa[m.estado]}</span><small>Ver cuenta y pedidos</small></div></button>)}
      {!rows.length && <p>No hay coincidencias.</p>}
    </div></section></OperacionRemoteState>
    {selectedId && creating === null && <MesaDetalle key={selectedId} id={selectedId} mesas={mesas} onClose={() => setSelectedId(null)} onCreate={setCreating} />}
    {creating !== null && <PedidoForm mesas={mesas} initialMesa={creating} onClose={() => setCreating(null)} onCreated={async id => { await mesas.refresh(); setCreating(null); setSelectedId(null); navigate(`/operacion/pedidos?pedido=${encodeURIComponent(id)}`); }} />}
  </div>;
}
