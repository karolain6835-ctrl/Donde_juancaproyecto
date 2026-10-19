import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import PerfilPanel from "./PerfilPanel";
import "./UserProfileMenu.css";

function UserProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nombre = typeof user?.nombre === "string" && user.nombre.trim() ? user.nombre : "Usuario";
  const inicial = nombre.trim().charAt(0).toUpperCase();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [panelActivo, setPanelActivo] = useState(null);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  function cerrarSesion() {
    logout();
    navigate("/login");
  }

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
                <strong>Cambiar contraseña</strong>
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

      {panelActivo && <PerfilPanel modo={panelActivo} onClose={cerrarPaneles} />}

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
                onClick={cerrarSesion}
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
