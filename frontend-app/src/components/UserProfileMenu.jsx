import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./UserProfileMenu.css";

function UserProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nombre = typeof user?.nombre === "string" && user.nombre.trim() ? user.nombre : "Usuario";
  const rol = typeof user?.rol === "string" && user.rol.trim() ? user.rol : "Sin rol";
  const correo = typeof user?.correo === "string" ? user.correo : typeof user?.email === "string" ? user.email : "Sin correo";
  const inicial = nombre.trim().charAt(0).toUpperCase();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [panelActivo, setPanelActivo] = useState(null);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  function cerrarPaneles() {
    setPanelActivo(null);
    setConfirmarSalida(false);
  }

  return (
    <>
      <div className="user-profile-menu">

        <button
          className={`user-profile-trigger ${
            menuAbierto ? "active" : ""
          }`}
          onClick={() => setMenuAbierto((actual) => !actual)}
        >
          <div className="user-profile-avatar">
            {inicial}
          </div>

          <div className="user-profile-info">
            <strong>Mi sesión</strong>
          </div>

          <span
            className={`user-profile-arrow ${
              menuAbierto ? "open" : ""
            }`}
          >
            ▾
          </span>
        </button>

        {menuAbierto && (
          <div className="user-profile-dropdown">

            <button
              onClick={() => {
                setPanelActivo("perfil");
                setMenuAbierto(false);
              }}
            >
              <span>👤</span>

              <div>
                <strong>Mi perfil</strong>
                <small>Información personal</small>
              </div>
            </button>

            <button
              onClick={() => {
                setPanelActivo("seguridad");
                setMenuAbierto(false);
              }}
            >
              <span>🔒</span>

              <div>
                <strong>Seguridad</strong>
                <small>Cambiar contraseña</small>
              </div>
            </button>

            <div className="user-profile-divider"></div>

            <button
              className="logout-option"
              onClick={() => {
                setConfirmarSalida(true);
                setMenuAbierto(false);
              }}
            >
              <span>↪</span>

              <div>
                <strong>Cerrar sesión</strong>
                <small>Salir del sistema</small>
              </div>
            </button>

          </div>
        )}

      </div>

      {panelActivo && (
        <>
          <div
            className="profile-overlay"
            onClick={cerrarPaneles}
          ></div>

          <aside className="profile-drawer">

            <div className="profile-drawer-header">

              <div>
                <p className="page-eyebrow">
                  {panelActivo === "perfil"
                    ? "MI PERFIL"
                    : "SEGURIDAD"}
                </p>

                <h2>
                  {panelActivo === "perfil"
                    ? "Perfil de usuario"
                    : "Cambiar contraseña"}
                </h2>
              </div>

              <button
                className="drawer-close"
                onClick={cerrarPaneles}
              >
                ×
              </button>

            </div>

            {panelActivo === "perfil" && (
              <div className="profile-content">

                <div className="profile-main-card">

                  <div className="profile-large-avatar">
                    {inicial}
                  </div>

                  <div>
                    <h3>{nombre}</h3>
                    <span>{rol}</span>
                  </div>

                </div>

                <div className="profile-detail-grid">

                  <div>
                    <span>Nombre</span>
                    <strong>{nombre}</strong>
                  </div>

                  <div>
                    <span>Rol</span>
                    <strong>{rol}</strong>
                  </div>

                  <div className="profile-full-field">
                    <span>Correo</span>
                    <strong>
                      {correo}
                    </strong>
                  </div>

                </div>

                <button className="drawer-primary-button">
                  Editar perfil
                </button>

                <div className="profile-notice">
                  La edición será conectada posteriormente al usuario
                  autenticado del backend.
                </div>

              </div>
            )}

            {panelActivo === "seguridad" && (
              <div className="security-form">

                <label>
                  Contraseña actual
                  <input
                    type="password"
                    placeholder="Ingresa tu contraseña actual"
                  />
                </label>

                <label>
                  Nueva contraseña
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                  />
                </label>

                <label>
                  Confirmar nueva contraseña
                  <input
                    type="password"
                    placeholder="Repite la nueva contraseña"
                  />
                </label>

                <button className="drawer-primary-button">
                  Cambiar contraseña
                </button>

                <div className="profile-notice">
                  La contraseña deberá validarse y actualizarse únicamente
                  desde el backend cuando conectemos autenticación.
                </div>

              </div>
            )}

          </aside>
        </>
      )}

      {confirmarSalida && (
        <>
          <div
            className="profile-overlay"
            onClick={() => setConfirmarSalida(false)}
          ></div>

          <div className="logout-confirmation">

            <p className="page-eyebrow">
              CERRAR SESIÓN
            </p>

            <h2>¿Deseas salir?</h2>

            <p>
              Se cerrará tu sesión actual en Donde Juanca.
            </p>

            <div className="logout-confirmation-actions">

              <button
                className="drawer-primary-button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Cerrar sesión
              </button>

              <button
                className="drawer-secondary-button"
                onClick={() => setConfirmarSalida(false)}
              >
                Cancelar
              </button>

            </div>

            <div className="profile-notice">
              Se eliminará la sesión guardada y volverás al inicio de sesión.
            </div>

          </div>
        </>
      )}

    </>
  );
}

export default UserProfileMenu;
