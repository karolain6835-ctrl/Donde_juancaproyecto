import { NavLink } from "react-router-dom";

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
  Search,
  Bell,
} from "lucide-react";

import UserProfileMenu from "../../components/UserProfileMenu";
import iconoDondeJuanca from "../../assets/brand/logos/icono.png";

import "./AdminLayout.css";

function AdminLayout({ children }) {
  function navLinkClass({ isActive }) {
    return isActive ? "nav-link active" : "nav-link";
  }

  function subNavLinkClass({ isActive }) {
    return isActive
      ? "nav-link sub active"
      : "nav-link sub";
  }

  return (
    <div className="admin-layout">

      {/* =========================================
          SIDEBAR
      ========================================== */}

      <aside className="sidebar">

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

          <NavLink
            to="/dashboard"
            className={navLinkClass}
          >
            <LayoutDashboard
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Dashboard</span>
          </NavLink>

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

              <NavLink
                to="/operacion/mesas"
                className={subNavLinkClass}
              >
                <Armchair
                  className="nav-icon"
                  size={18}
                  strokeWidth={1.9}
                />

                <span>Mesas</span>
              </NavLink>

              <NavLink
                to="/operacion/pedidos"
                className={subNavLinkClass}
              >
                <ClipboardList
                  className="nav-icon"
                  size={18}
                  strokeWidth={1.9}
                />

                <span>Pedidos</span>
              </NavLink>

              <NavLink
                to="/operacion/kanban"
                className={subNavLinkClass}
              >
                <Columns3
                  className="nav-icon"
                  size={18}
                  strokeWidth={1.9}
                />

                <span>Kanban</span>
              </NavLink>

            </div>
          </div>

          {/* INVENTARIO */}

          <NavLink
            to="/inventario"
            className={navLinkClass}
          >
            <Boxes
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Inventario</span>
          </NavLink>

          {/* COMPRAS */}

          <NavLink
            to="/compras"
            className={navLinkClass}
          >
            <ShoppingCart
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Compras</span>
          </NavLink>

          {/* JUEGOS */}

          <NavLink
            to="/juegos"
            className={navLinkClass}
          >
            <Gamepad2
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Juegos</span>
          </NavLink>

          {/* CAJA */}

          <NavLink
            to="/caja"
            className={navLinkClass}
          >
            <WalletCards
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Caja y pagos</span>
          </NavLink>

          {/* CLIENTES */}

          <NavLink
            to="/clientes"
            className={navLinkClass}
          >
            <Users
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Clientes</span>
          </NavLink>

          {/* REPORTES */}

          <NavLink
            to="/reportes"
            className={navLinkClass}
          >
            <BarChart3
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Reportes</span>
          </NavLink>

          {/* ADMINISTRACIÓN */}

          <NavLink
            to="/administracion"
            className={navLinkClass}
          >
            <Settings2
              className="nav-icon"
              size={20}
              strokeWidth={1.9}
            />

            <span>Administración</span>
          </NavLink>

        </nav>

        {/* PERFIL */}

        <UserProfileMenu />

      </aside>

      {/* =========================================
          ÁREA PRINCIPAL
      ========================================== */}

      <div className="admin-main">

        {/* HEADER */}

        <header className="admin-header">

          <div className="header-welcome">
            <h3>Buenos días, Karol</h3>

            <p>
              Esto es lo que está pasando hoy en Donde Juanca.
            </p>
          </div>

          <div className="header-actions">

            {/* BÚSQUEDA */}

            <div className="global-search-wrapper">
              <Search
                className="global-search-icon"
                size={18}
                strokeWidth={1.9}
                aria-hidden="true"
              />

              <input
                type="text"
                placeholder="Buscar..."
                className="global-search"
                aria-label="Buscar en DondeJuanca"
              />
            </div>

            {/* NOTIFICACIONES */}

            <button
              type="button"
              className="notification-button"
              aria-label="Notificaciones"
            >
              <Bell
                size={21}
                strokeWidth={1.9}
              />

              <span className="notification-dot"></span>
            </button>

            {/* USUARIO DEL HEADER */}

            <div className="header-user">
              <div className="user-avatar small">
                K
              </div>

              <div className="header-user-copy">
                <strong>Karol</strong>
                <span>Administrador</span>
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