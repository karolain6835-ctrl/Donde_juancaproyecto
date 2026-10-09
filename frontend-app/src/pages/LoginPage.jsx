import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import logoDondeJuanca from "../assets/brand/logos/oscuro.png";

import "./LoginPage.css";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");

  function iniciarSesion(event) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    setError("");

    /*
      Inicio de sesión temporal/local.
      Cuando conectemos autenticación con el backend,
      esta navegación será reemplazada por la llamada real a la API.
    */
    navigate("/dashboard");
  }

  return (
    <main className="login-page">

      <section className="login-brand-panel">

        <div className="login-brand-decoration login-brand-decoration-one"></div>
        <div className="login-brand-decoration login-brand-decoration-two"></div>

        <div className="login-brand-content">

          <div className="login-logo-area">

            <img
              src={logoDondeJuanca}
              alt="Donde Juanca"
              className="login-logo"
            />

          </div>

          <div className="login-brand-copy">

            <p className="login-eyebrow">
              BAR & JUEGOS
            </p>

            <h1>
              La tradición también se administra bien.
            </h1>

            <p>
              Controla mesas, pedidos, inventario, juegos y caja desde
              un solo lugar.
            </p>

          </div>

          <div className="login-brand-footer">

            <div className="login-brand-feature">

              <ShieldCheck
                size={18}
                strokeWidth={1.9}
              />

              <span>
                Acceso exclusivo para personal autorizado
              </span>

            </div>

          </div>

        </div>

      </section>

      <section className="login-access-panel">

        <div className="login-form-container">

          <div className="login-form-header">

            <p className="login-form-eyebrow">
              SISTEMA DE GESTIÓN
            </p>

            <h2>
              Bienvenido de nuevo
            </h2>

            <p>
              Ingresa tus datos para acceder a Donde Juanca.
            </p>

          </div>

          <form
            className="login-form"
            onSubmit={iniciarSesion}
          >

            <label>
              Correo electrónico

              <div className="login-input-wrapper">

                <Mail
                  size={18}
                  strokeWidth={1.9}
                />

                <input
                  type="email"
                  placeholder="correo@dondejuanca.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  autoComplete="email"
                />

              </div>

            </label>

            <label>
              Contraseña

              <div className="login-input-wrapper">

                <LockKeyhole
                  size={18}
                  strokeWidth={1.9}
                />

                <input
                  type={mostrarPassword ? "text" : "password"}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() =>
                    setMostrarPassword(
                      (actual) => !actual
                    )
                  }
                  aria-label={
                    mostrarPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {mostrarPassword ? (
                    <EyeOff
                      size={18}
                      strokeWidth={1.9}
                    />
                  ) : (
                    <Eye
                      size={18}
                      strokeWidth={1.9}
                    />
                  )}
                </button>

              </div>

            </label>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
            >
              Iniciar sesión

              <ArrowRight
                size={18}
                strokeWidth={1.9}
              />
            </button>

          </form>

          <div className="login-security-note">

            <LockKeyhole
              size={15}
              strokeWidth={1.9}
            />

            <span>
              Tus credenciales permiten acceder únicamente a las
              funciones autorizadas para tu rol.
            </span>

          </div>

        </div>

        <p className="login-copyright">
          Donde Juanca · Sistema interno de gestión
        </p>

      </section>

    </main>
  );
}

export default LoginPage;