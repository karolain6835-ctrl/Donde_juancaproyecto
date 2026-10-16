import {useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {TrendingUp,ClipboardList,WalletCards,TriangleAlert,ArrowRight,CircleDot,Target,Plus,PackagePlus,UserPlus,CircleDollarSign,RefreshCw} from 'lucide-react';
import Can from '../components/Can';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {formatDate,formatDateTime,formatTime} from '../utils/dateTime';
import {formatCurrency} from '../utils/formatCurrency';
import {useRemoteCatalog} from '../hooks/useRemoteCatalog';
import {ingresosHoyDashboard,ingresosSemanaDashboard,pedidosDashboard,mesasDashboard,alertasDashboard,pagosDashboard,juegosDashboard,fuenteDashboard} from '../services/dashboardService';
import './DashboardPage.css';

function useDashboardSource(permiso,loader){
 const {user}=useAuth();const permitido=can(user,permiso);
 return useRemoteCatalog(useCallback(options=>permitido?fuenteDashboard(loader,options):Promise.resolve(null),[permitido,loader]));
}
function BloqueRemoto({resource,children}){
 if(resource.loading)return <p role="status">Cargando información...</p>;
 if(resource.error)return <div role="alert"><p>{resource.error}</p><button className="text-button" onClick={resource.refresh}>Reintentar</button></div>;
 return resource.data?children:null;
}
function DashboardPage(){
 const navigate=useNavigate();const {user}=useAuth();
 const acciones=['compras.crear','productos.crear','usuarios.registrar','cierres.crear'].some(p=>can(user,p));
 const hoy=useDashboardSource('pagos.ver',ingresosHoyDashboard);
 const pedidos=useDashboardSource('pedidos.ver',pedidosDashboard);
 const caja=useDashboardSource('pagos.ver',pagosDashboard);
 const alertas=useDashboardSource('alertas.ver',alertasDashboard);
 const semana=useDashboardSource('pagos.ver',ingresosSemanaDashboard);
 const mesas=useDashboardSource('mesas.ver',mesasDashboard);
 const juegos=useDashboardSource('juegos.ver',juegosDashboard);
 const fuentes=[hoy,pedidos,caja,alertas,semana,mesas,juegos];
 const ultima=fuentes.map(r=>r.data?.cargado_en).filter(Boolean).sort().at(-1);
 const fechaActual=formatDate(new Date(),{weekday:'long',day:'numeric',month:'long'});
 const fechaFormateada=fechaActual.charAt(0).toUpperCase()+fechaActual.slice(1);
 const ingresos=hoy.data?.datos,ordenes=pedidos.data?.datos,pagos=caja.data?.datos,episodios=alertas.data?.datos,ventasSemana=semana.data?.datos,salon=mesas.data?.datos,sesiones=juegos.data?.datos;
 async function actualizar(){await Promise.all(fuentes.map(r=>r.refresh()));}
 return <div className="dashboard-page">
  <header className="dashboard-title"><p className="page-eyebrow">RESUMEN DEL DÍA</p><h1 className="page-title">El negocio, de un vistazo</h1><p className="page-description">{fechaFormateada}{ultima&&<> · <span title={'Última fuente cargada: '+formatDateTime(ultima)}>Actualizado {formatTime(ultima)}</span></>}</p><button className="text-button" disabled={fuentes.some(r=>r.loading)} onClick={actualizar}><RefreshCw size={15}/>Actualizar</button></header>
  <section className="dashboard-kpis">
   <Can permission="pagos.ver"><article className="kpi-card"><div className="kpi-icon success"><TrendingUp size={21} strokeWidth={1.9}/></div><span>Ingresos verificados hoy</span><BloqueRemoto resource={hoy}><strong>{formatCurrency(ingresos?.total)}</strong><small>{ingresos?.cantidad} pagos · fecha de pago UTC</small></BloqueRemoto></article></Can>
   <Can permission="pedidos.ver"><article className="kpi-card"><div className="kpi-icon orange"><ClipboardList size={21} strokeWidth={1.9}/></div><span>Pedidos activos</span><BloqueRemoto resource={pedidos}><strong>{ordenes?.paginacion.total}</strong><small>Pedidos abiertos</small></BloqueRemoto></article></Can>
   <Can permission="pagos.ver"><article className="kpi-card"><div className="kpi-icon neutral"><WalletCards size={21} strokeWidth={1.9}/></div><span>Pagos pendientes</span><BloqueRemoto resource={caja}><strong>{pagos?.pendientes}</strong><small>{pagos?.verificados} verificados · {formatCurrency(pagos?.total_verificado)} acumulados</small></BloqueRemoto></article></Can>
   <Can permission="alertas.ver"><article className="kpi-card alert-card"><div className="kpi-icon danger"><TriangleAlert size={21} strokeWidth={1.9}/></div><span>Alertas activas</span><BloqueRemoto resource={alertas}><strong>{episodios?.paginacion.total}</strong><small>Stock bajo y productos agotados</small></BloqueRemoto></article></Can>
  </section>
  <section className="dashboard-main-grid">
   <Can permission="pagos.ver"><article className="dashboard-panel sales-panel"><div className="panel-title"><div><h2>Ingresos últimos 7 días</h2><p>Pagos verificados por fecha de pago (UTC)</p></div><span className="period-button">7 días</span></div><BloqueRemoto resource={semana}><div className="sales-summary"><span>Ingresos del período</span><strong>{formatCurrency(ventasSemana?.total)}</strong></div><div className="fake-chart" role="img" aria-label={(ventasSemana?.dias||[]).map(d=>d.fecha+': '+formatCurrency(d.total)).join('; ')}>{(ventasSemana?.dias||[]).map((d,i)=><div key={d.fecha} className={i===ventasSemana.dias.findIndex(v=>v.altura===100)?'highlight':''} style={{height:d.altura+'%'}} title={d.fecha+': '+formatCurrency(d.total)}/>)}</div><div className="chart-labels">{(ventasSemana?.dias||[]).map(d=><span key={d.fecha} title={d.fecha}>{new Intl.DateTimeFormat('es-CO',{timeZone:'UTC',weekday:'short',day:'numeric'}).format(new Date(d.fecha+'T12:00:00Z'))}</span>)}</div>{ventasSemana?.dias.every(d=>d.cantidad===0)&&<p>No hay pagos verificados en este período.</p>}</BloqueRemoto></article></Can>
   <Can permission="mesas.ver"><article className="dashboard-panel operation-panel"><div className="panel-title"><div><h2>Operación actual</h2><p>Estado actual de las mesas</p></div><button className="text-button" onClick={()=>navigate('/operacion/mesas')}>Ver salón<ArrowRight size={16}/></button></div><BloqueRemoto resource={mesas}><div className="operation-stats"><div><span>Total</span><strong>{salon?.total}</strong></div><div><span>Disponibles</span><strong>{salon?.disponibles}</strong></div><div><span>Ocupadas</span><strong>{salon?.ocupadas}</strong></div></div><p>En cobro: {salon?.en_cobro}</p><div className="mini-tables">{(salon?.mesas||[]).map(m=><div key={m.id} className={'mini-table '+({disponible:'available',ocupada:'occupied',en_cobro:'payment'}[m.estado])} title={'Mesa '+m.numero+' · '+({disponible:'Disponible',ocupada:'Ocupada',en_cobro:'En cobro'}[m.estado])}>{m.numero}</div>)}</div>{salon?.total===0&&<p>No hay mesas para mostrar.</p>}</BloqueRemoto></article></Can>
  </section>
  <section className="dashboard-secondary-grid">
   <Can permission="alertas.ver"><article className="dashboard-panel"><div className="panel-title"><div><h2>Inventario con alertas</h2><p>Hasta cinco alertas activas, según el orden del sistema</p></div><button className="text-button" onClick={()=>navigate('/inventario')}>Ver alertas<ArrowRight size={16}/></button></div><BloqueRemoto resource={alertas}><div className="critical-list">{(episodios?.datos||[]).map(a=><div className="critical-item" key={a.id}><div><strong>{a.producto||'Producto sin nombre'}</strong><span>Stock actual: {a.stock_actual} · mínimo: {a.stock_minimo}</span></div><span className={'status-chip '+(a.tipo==='agotado'?'danger':'warning')}>{a.tipo==='agotado'?'Agotado':'Bajo'}</span></div>)}</div>{!episodios?.datos.length&&<p>No hay alertas activas.</p>}</BloqueRemoto></article></Can>
   <Can permission="juegos.ver"><article className="dashboard-panel"><div className="panel-title"><div><h2>Juegos activos</h2><p>Sesiones en curso</p></div><button className="text-button" onClick={()=>navigate('/juegos')}>Ver juegos<ArrowRight size={16}/></button></div><BloqueRemoto resource={juegos}><div className="game-list">{(sesiones||[]).map(s=><div className="game-item" key={s.id}><div className="game-icon">{s.tipo_juego==='tejo'?<Target size={21}/>:<CircleDot size={21}/>}</div><div><strong>{s.activo_nombre||'Juego'}</strong><span>Mesa {s.mesa_numero??'—'} · Inicio {formatDateTime(s.fecha_inicio)}</span></div><span className="status-chip success">Activo</span></div>)}</div>{!sesiones?.length&&<p>No hay sesiones activas.</p>}</BloqueRemoto></article></Can>
  </section>
  <section className="dashboard-bottom-grid">
   <Can permission="pedidos.ver"><article className="dashboard-panel"><div className="panel-title"><div><h2>Pedidos abiertos recientes</h2><p>Hasta cinco pedidos, por fecha de creación</p></div></div><BloqueRemoto resource={pedidos}><div className="activity-list">{(ordenes?.datos||[]).map(p=><div className="activity-item" key={p.id}><span className="activity-time">{formatTime(p.creado_en)}</span><div><strong>Mesa {p.mesa_numero??'—'} · Pedido #{p.id.slice(0,8)}</strong><span>{p.responsable_nombre||'Sin nombre de responsable'} · {formatDate(p.creado_en)}</span></div></div>)}</div>{!ordenes?.datos.length&&<p>No hay pedidos abiertos.</p>}</BloqueRemoto></article></Can>
   {acciones&&<article className="dashboard-panel quick-actions-panel"><div className="panel-title"><div><h2>Acciones rápidas</h2><p>Gestiones frecuentes</p></div></div><div className="quick-actions"><Can permission="compras.crear"><button onClick={()=>navigate('/compras')}><span><Plus size={21}/></span>Nueva compra</button></Can><Can permission="productos.crear"><button onClick={()=>navigate('/inventario')}><span><PackagePlus size={21}/></span>Registrar producto</button></Can><Can permission="usuarios.registrar"><button onClick={()=>navigate('/administracion')}><span><UserPlus size={21}/></span>Crear usuario</button></Can><Can permission="cierres.crear"><button className="accent-action" onClick={()=>navigate('/caja')}><span><CircleDollarSign size={21}/></span>Cerrar caja</button></Can></div></article>}
  </section>
 </div>;
}
export default DashboardPage;
