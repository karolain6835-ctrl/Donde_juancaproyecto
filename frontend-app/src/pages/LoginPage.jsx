import { useRef, useState } from "react";
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
  const [enviando, setEnviando] = useState(false);
  const solicitudEnCurso = useRef(false);

  async function iniciarSesion(event) {
    event.preventDefault();
    if (solicitudEnCurso.current) return;

    if (!email.trim() || !password.trim()) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    setError("");
    solicitudEnCurso.current = true;
    setEnviando(true);

    try {
      let respuesta;
      try {
        respuesta = await fetch("http://localhost:5000/api/usuarios/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo: email, contrasena: password }),
        });
      } catch {
        setError("No se pudo conectar con el servidor. Intenta nuevamente.");
        return;
      }

      const datos = await respuesta.json().catch(() => null);
      const mensaje = typeof datos?.error === "string"
        ? datos.error
        : typeof datos?.mensaje === "string" ? datos.mensaje : null;

      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          setError("Correo o contraseña incorrectos.");
        } else if (respuesta.status === 403) {
          setError(mensaje || "El usuario está inactivo o bloqueado.");
        } else if (respuesta.status === 400) {
          setError(mensaje || "Revisa el correo y la contraseña ingresados.");
        } else {
          setError("Ocurrió un error en el servidor. Intenta nuevamente más tarde.");
        }
        return;
      }

      if (typeof datos?.token !== "string" || !datos.token ||
          !datos.usuario || typeof datos.usuario !== "object" ||
          Array.isArray(datos.usuario)) {
        setError("El servidor devolvió una respuesta de login inválida.");
        return;
      }

      try {
        localStorage.setItem("dondejuanca_usuario", JSON.stringify(datos.usuario));
        localStorage.setItem("dondejuanca_token", datos.token);
      } catch {
        try {
          localStorage.removeItem("dondejuanca_usuario");
          localStorage.removeItem("dondejuanca_token");
        } catch {
          // El navegador puede bloquear también la eliminación del almacenamiento.
        }
        setError("No se pudo guardar la sesión en el navegador.");
        return;
      }

      navigate("/dashboard");
    } finally {
      solicitudEnCurso.current = false;
      setEnviando(false);
    }
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
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={enviando}
              aria-busy={enviando}
            >
              {enviando ? "Iniciando sesión…" : "Iniciar sesión"}

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
