import GlobalHeaderTools from '../../components/GlobalHeaderTools';
import Can from "../../components/Can";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useEffect, useRef, useState } from 'react';

import {
  LayoutDashboard,
  Armchair,
  ClipboardList,
  Columns3,
  Boxes,
  ShoppingCart,
  Gamepad2,
  WalletCards,
  Users,
  BarChart3,
  Settings2,
  Menu,
  X,
} from "lucide-react";

import UserProfileMenu from "../../components/UserProfileMenu";
import iconoDondeJuanca from "../../assets/brand/logos/icono.png";

import "./AdminLayout.css";

function AdminLayout({ children }) {
  const { user } = useAuth();
  // En pantallas angostas el menú no reserva espacio y retiene el foco al abrirse.
  const [compact,setCompact]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 1100px)').matches);
  const [menuOpen,setMenuOpen]=useState(false);
  const menuButton=useRef(null),sidebar=useRef(null);
  function closeMenu(){setMenuOpen(false);requestAnimationFrame(()=>menuButton.current?.focus());}
  useEffect(()=>{
    const media=window.matchMedia('(max-width: 1100px)');
    const resize=()=>{setCompact(media.matches);setMenuOpen(false);};
    media.addEventListener('change',resize);
    return ()=>media.removeEventListener('change',resize);
  },[]);
  useEffect(()=>{
    if(!compact||!menuOpen)return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const focusFrame=requestAnimationFrame(()=>{sidebar.current?.getBoundingClientRect();sidebar.current?.querySelector('button')?.focus({preventScroll:true});});
    const keyboard=e=>{
      if(e.key==='Escape'){e.preventDefault();setMenuOpen(false);requestAnimationFrame(()=>menuButton.current?.focus());}
      if(e.key==='Tab'){
        const controls=[...sidebar.current.querySelectorAll('a[href],button,input,select,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
        const first=controls[0],last=controls.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',keyboard);
    return ()=>{cancelAnimationFrame(focusFrame);document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',keyboard);};
  },[compact,menuOpen]);
  const nombre = typeof user?.nombre === "string" && user.nombre.trim() ? user.nombre : "Usuario";
  const rol = typeof user?.rol === "string" && user.rol.trim() ? user.rol : "Sin rol";
  const inicial = nombre.trim().charAt(0).toUpperCase();
  function navLinkClass({ isActive }) {
    return isActive ? "nav-link active" : "nav-link";
  }

  function subNavLinkClass({ isActive }) {
    return isActive
      ? "nav-link sub active"
      : "nav-link sub";
  }

  return (
    <div className={`admin-layout${menuOpen?' sidebar-open':''}`}>

      {/* =========================================
          SIDEBAR
      ========================================== */}

      {compact&&menuOpen&&<button className="sidebar-overlay" aria-label="Cerrar menú de navegación" onClick={closeMenu}/>}
      <aside id="menu-principal" ref={sidebar} className="sidebar" aria-label="Menú principal" onTransitionEnd={e=>{if(e.target===sidebar.current&&menuOpen)sidebar.current.querySelector('button')?.focus({preventScroll:true});}} inert={compact&&!menuOpen} onClick={e=>{if(compact&&e.target.closest('a[href]'))closeMenu();}}>
        <button className="sidebar-close" aria-label="Cerrar menú" onClick={closeMenu}><X size={20}/></button>

        {/* IDENTIDAD */}

        <div className="sidebar-logo">
          <img
            src={iconoDondeJuanca}
            alt=""
            aria-hidden="true"
            className="sidebar-brand-icon"
          />

          <div className="sidebar-brand-copy">
            <strong>DondeJuanca</strong>
            <span>BAR & JUEGOS</span>
          </div>
        </div>

        <p className="menu-label">
          MENÚ PRINCIPAL
        </p>

        {/* NAVEGACIÓN */}

        <nav className="sidebar-nav">

          {/* DASHBOARD */}

          <Can permission="dashboard.ver"><NavLink
            to="/dashboard"
            className={navLinkClass}
          >
            <LayoutDashboard
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Dashboard</span>
          </NavLink></Can>

          {/* OPERACIÓN */}

          <div className="nav-group">

            <div className="nav-group-title">
              <ClipboardList
                className="nav-icon"
                size={20}
                strokeWidth={1.9}
              />

              <span>Operación</span>
            </div>

            <div className="nav-submenu">

              <Can permission="mesas.ver"><NavLink
                to="/operacion/mesas"
                className={subNavLinkClass}
              >
                <Armchair
                  className="nav-icon"
                  size={18}
                  strokeWidth={1.9}
                />

                <span>Mesas</span>
              </NavLink></Can>

              <Can permission="pedidos.ver"><NavLink
                to="/operacion/pedidos"
                className={subNavLinkClass}
              >
                <ClipboardList
                  className="nav-icon"
                  size={18}
                  strokeWidth={1.9}
                />

                <span>Pedidos</span>
              </NavLink></Can>

              <Can permission="kanban.ver"><NavLink
                to="/operacion/kanban"
                className={subNavLinkClass}
              >
                <Columns3
                  className="nav-icon"
                  size={18}
                  strokeWidth={1.9}
                />

                <span>Kanban</span>
              </NavLink></Can>

            </div>
          </div>

          {/* INVENTARIO */}

          <Can permission="inventario.ver"><NavLink
            to="/inventario"
            className={navLinkClass}
          >
            <Boxes
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Inventario</span>
          </NavLink></Can>

          {/* COMPRAS */}

          <Can permission="compras.ver"><NavLink
            to="/compras"
            className={navLinkClass}
          >
            <ShoppingCart
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Compras</span>
          </NavLink></Can>

          {/* JUEGOS */}

          <Can permission="juegos.ver"><NavLink
            to="/juegos"
            className={navLinkClass}
          >
            <Gamepad2
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Juegos</span>
          </NavLink></Can>

          {/* CAJA */}

          <Can permission="caja.ver"><NavLink
            to="/caja"
            className={navLinkClass}
          >
            <WalletCards
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Caja y pagos</span>
          </NavLink></Can>

          {/* CLIENTES */}

          <Can permission="clientes.ver"><NavLink
            to="/clientes"
            className={navLinkClass}
          >
            <Users
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Clientes</span>
          </NavLink></Can>

          {/* REPORTES */}

          <Can permission="reportes.ver"><NavLink
            to="/reportes"
            className={navLinkClass}
          >
            <BarChart3
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Reportes</span>
          </NavLink></Can>

          {/* ADMINISTRACIÓN */}

          <Can permission="administracion.ver"><NavLink
            to="/administracion"
            className={navLinkClass}
          >
            <Settings2
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Administración</span>
          </NavLink></Can>

        </nav>

        {/* PERFIL */}

        <UserProfileMenu />

      </aside>

      {/* =========================================
          ÁREA PRINCIPAL
      ========================================== */}

      <div className="admin-main" inert={compact&&menuOpen}>

        {/* HEADER */}

        <header className="admin-header">
          <button ref={menuButton} className="sidebar-toggle" aria-label="Abrir menú" aria-controls="menu-principal" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)}><Menu size={22}/></button>

          <div className="header-welcome">
            <h3>Buenos días, {nombre}</h3>

            <p>
              Esto es lo que está pasando hoy en Donde Juanca.
            </p>
          </div>

          <div className="header-actions">

            {/* BÚSQUEDA */}

            <GlobalHeaderTools />

            {/* USUARIO DEL HEADER */}

            <div className="header-user" role="group" aria-label={`${nombre}, ${rol}`} title={`${nombre} · ${rol}`}>
              <div className="user-avatar small">
                {inicial}
              </div>

              <div className="header-user-copy">
                <strong>{nombre}</strong>
                <span>{rol}</span>
              </div>
            </div>

          </div>

        </header>

        {/* CONTENIDO */}

        <main className="admin-content">
          {children}
        </main>

      </div>
    </div>
  );
}

export default AdminLayout;
