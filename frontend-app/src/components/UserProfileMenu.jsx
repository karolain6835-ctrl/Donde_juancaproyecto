import { useState } from "react";
import "./UserProfileMenu.css";

function UserProfileMenu() {
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
            K
          </div>

          <div className="user-profile-info">
            <strong>Karol</strong>
            <span>Administrador</span>
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
                    K
                  </div>

                  <div>
                    <h3>Karol</h3>
                    <span>Administrador</span>
                  </div>

                </div>

                <div className="profile-detail-grid">

                  <div>
                    <span>Nombre</span>
                    <strong>Karol</strong>
                  </div>

                  <div>
                    <span>Rol</span>
                    <strong>Administrador</strong>
                  </div>

                  <div className="profile-full-field">
                    <span>Correo</span>
                    <strong>
                      karol@dondejuanca.com
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
                  setConfirmarSalida(false);
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
              Por ahora esta acción es visual. Después eliminará la sesión
              o token de autenticación y llevará al login.
            </div>

          </div>
        </>
      )}

    </>
  );
}

export default UserProfileMenu;