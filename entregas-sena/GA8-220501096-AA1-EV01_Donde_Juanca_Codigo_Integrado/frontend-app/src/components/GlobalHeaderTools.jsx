import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import { searchDestinations } from '../utils/globalNavigation';
import { listarAlertas } from '../services/alertasInventarioService';
import { useRemoteCatalog } from '../hooks/useRemoteCatalog';
import PerfilPanel from './PerfilPanel';
import './GlobalHeaderTools.css';

export default function GlobalHeaderTools() {
 const {user}=useAuth();
 const navigate=useNavigate();
 const root=useRef(null), input=useRef(null);
 const [query,setQuery]=useState(''),[searchOpen,setSearchOpen]=useState(false),[notificationsOpen,setNotificationsOpen]=useState(false),[profileOpen,setProfileOpen]=useState(false);
 const permitted=can(user,'alertas.ver');
 const loader=useCallback(options=>permitted?listarAlertas({estado:'activa',limite:5},options):Promise.resolve(null),[permitted]);
 const alerts=useRemoteCatalog(loader);
 const results=searchDestinations(query,user);
 const total=permitted&&!alerts.error?(alerts.data?.paginacion.total??0):0;
 useEffect(()=>{
  function outside(event){if(!root.current?.contains(event.target)){setSearchOpen(false);setNotificationsOpen(false);}}
  document.addEventListener('pointerdown',outside);
  return ()=>document.removeEventListener('pointerdown',outside);
 },[]);
 function openDestination(item){
  setSearchOpen(false);setNotificationsOpen(false);setQuery('');
  if(item.section==='perfil')setProfileOpen(true);
  else navigate(item.path,{state:{headerSection:item.section}});
 }
 function searchKey(event){
  if(event.key==='Enter'&&results.length){event.preventDefault();openDestination(results[0]);}
 }
 function toggleNotifications(){
  const next=!notificationsOpen;
  setNotificationsOpen(next);setSearchOpen(false);
  if(next)alerts.refresh();
 }
 return <div className="global-header-tools" ref={root} onKeyDown={event=>{if(event.key==='Escape'){setSearchOpen(false);setNotificationsOpen(false);input.current?.focus();}}}>
  <div className="global-search-wrapper">
   <Search className="global-search-icon" size={18} aria-hidden="true" />
   <input ref={input} type="search" placeholder="Buscar..." className="global-search" aria-label="Buscar en DondeJuanca" aria-expanded={searchOpen&&Boolean(query.trim())} aria-controls="global-search-results" autoComplete="off" value={query} onFocus={()=>setSearchOpen(true)} onChange={event=>{setQuery(event.target.value);setSearchOpen(true);setNotificationsOpen(false);}} onKeyDown={searchKey} />
   {searchOpen&&query.trim()&&<div id="global-search-results" className="header-popover" aria-label="Resultados de búsqueda">
    {results.length?results.map(item=><button type="button" key={item.label} onClick={()=>openDestination(item)}>{item.label}</button>):<p role="status">No encontramos módulos con ese nombre.</p>}
   </div>}
  </div>
  {permitted&&<div className="header-notifications">
   <button type="button" className="notification-button" aria-label={total?'Notificaciones: '+total+' alertas activas':'Notificaciones'} aria-expanded={notificationsOpen} aria-controls="header-alerts" onClick={toggleNotifications}><Bell size={21} aria-hidden="true" />{total>0&&<span className="header-notification-count">{total}</span>}</button>
   {notificationsOpen&&<section id="header-alerts" className="header-popover header-alerts" aria-label="Alertas de inventario">
    <h3>Alertas de inventario</h3>
    {alerts.loading?<p role="status">Cargando alertas...</p>:alerts.error?<div role="alert"><p>No fue posible cargar las alertas.</p><button type="button" onClick={alerts.refresh}>Reintentar</button></div>:!alerts.data?.datos.length?<p>No hay alertas pendientes.</p>:<><p>{total} alertas activas</p>{alerts.data.datos.map(alert=><button type="button" key={alert.id} onClick={()=>openDestination({path:'/inventario',section:'alertas'})}><strong>{alert.producto||'Producto'}</strong><span>{alert.tipo==='agotado'?'Agotado':'Stock bajo'} · Stock: {alert.stock_actual} · Mínimo: {alert.stock_minimo}</span></button>)}</>}
    <button type="button" className="header-alerts-link" onClick={()=>openDestination({path:'/inventario',section:'alertas'})}>Ver todas las alertas</button>
   </section>}
  </div>}
  {profileOpen&&<PerfilPanel modo="perfil" onClose={()=>setProfileOpen(false)} />}
 </div>;
}
