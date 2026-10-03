import { useMemo, useState } from "react";
import RolesPermisosSection from "../components/RolesPermisosSection";
import AuditoriaSection from "../components/AuditoriaSection";
import ConfiguracionSection from "../components/ConfiguracionSection";
import "./AdministracionPage.css";

function AdministracionPage() {
  const [seccionActiva, setSeccionActiva] = useState("usuarios");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState(null);

  const [mostrarNuevoUsuario, setMostrarNuevoUsuario] =
    useState(false);

  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    email: "",
    rol: "Mesera",
    password: "",
  });

  const [usuarios, setUsuarios] = useState([
    {
      id: 1,
      nombre: "Karol",
      email: "karol@dondejuanca.com",
      rol: "Administrador",
      estado: "activo",
      ultimoAcceso: "02/10/2026 16:40",
    },
    {
      id: 2,
      nombre: "Laura Gómez",
      email: "laura@dondejuanca.com",
      rol: "Mesera",
      estado: "activo",
      ultimoAcceso: "02/10/2026 15:58",
    },
    {
      id: 3,
      nombre: "Carlos Ruiz",
      email: "carlos@dondejuanca.com",
      rol: "Mesero",
      estado: "activo",
      ultimoAcceso: "02/10/2026 15:35",
    },
    {
      id: 4,
      nombre: "Daniela Torres",
      email: "daniela@dondejuanca.com",
      rol: "Caja",
      estado: "activo",
      ultimoAcceso: "02/10/2026 14:50",
    },
    {
      id: 5,
      nombre: "Andrés Pérez",
      email: "andres@dondejuanca.com",
      rol: "Juegos",
      estado: "inactivo",
      ultimoAcceso: "28/09/2026 20:10",
    },
  ]);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return usuarios.filter((usuario) => {
      const coincideEstado =
        filtroEstado === "todos" ||
        usuario.estado === filtroEstado;

      const coincideBusqueda =
        usuario.nombre.toLowerCase().includes(texto) ||
        usuario.email.toLowerCase().includes(texto) ||
        usuario.rol.toLowerCase().includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [usuarios, busqueda, filtroEstado]);

  function cambiarEstadoUsuario(id) {
    setUsuarios((actuales) =>
      actuales.map((usuario) =>
        usuario.id === id
          ? {
              ...usuario,
              estado:
                usuario.estado === "activo"
                  ? "inactivo"
                  : "activo",
            }
          : usuario
      )
    );

    setUsuarioSeleccionado((actual) =>
      actual && actual.id === id
        ? {
            ...actual,
            estado:
              actual.estado === "activo"
                ? "inactivo"
                : "activo",
          }
        : actual
    );
  }

  function cambiarRolUsuario(nuevoRol) {
    if (!usuarioSeleccionado) return;

    setUsuarios((actuales) =>
      actuales.map((usuario) =>
        usuario.id === usuarioSeleccionado.id
          ? {
              ...usuario,
              rol: nuevoRol,
            }
          : usuario
      )
    );

    setUsuarioSeleccionado((actual) =>
      actual
        ? {
            ...actual,
            rol: nuevoRol,
          }
        : null
    );
  }

  function cerrarNuevoUsuario() {
    setMostrarNuevoUsuario(false);

    setNuevoUsuario({
      nombre: "",
      email: "",
      rol: "Mesera",
      password: "",
    });
  }

  function crearUsuario(event) {
    event.preventDefault();

    if (
      !nuevoUsuario.nombre.trim() ||
      !nuevoUsuario.email.trim() ||
      !nuevoUsuario.password.trim()
    ) {
      return;
    }

    const usuario = {
      id: Date.now(),
      nombre: nuevoUsuario.nombre.trim(),
      email: nuevoUsuario.email.trim(),
      rol: nuevoUsuario.rol,
      estado: "activo",
      ultimoAcceso: "Sin acceso",
    };

    setUsuarios((actuales) => [
      ...actuales,
      usuario,
    ]);

    cerrarNuevoUsuario();
  }

  return (
    <div className="administracion-page">

      {/* =====================================================
          ENCABEZADO
      ====================================================== */}

      <header className="administracion-header">

        <div>
          <p className="page-eyebrow">
            ADMINISTRACIÓN
          </p>

          <h1 className="page-title">
            {seccionActiva === "usuarios" && "Usuarios"}

            {seccionActiva === "roles" &&
              "Roles y permisos"}

            {seccionActiva === "auditoria" &&
              "Auditoría"}

            {seccionActiva === "configuracion" &&
              "Configuración"}
          </h1>

          <p className="page-description">
            Gestiona acceso, permisos y configuración del sistema.
          </p>
        </div>

        {seccionActiva === "usuarios" && (
          <button
            className="primary-button"
            onClick={() =>
              setMostrarNuevoUsuario(true)
            }
          >
            + Crear usuario
          </button>
        )}

      </header>

      {/* =====================================================
          NAVEGACIÓN INTERNA
      ====================================================== */}

      <nav className="administracion-nav">

        <button
          className={
            seccionActiva === "usuarios"
              ? "active"
              : ""
          }
          onClick={() =>
            setSeccionActiva("usuarios")
          }
        >
          Usuarios
        </button>

        <button
          className={
            seccionActiva === "roles"
              ? "active"
              : ""
          }
          onClick={() =>
            setSeccionActiva("roles")
          }
        >
          Roles y permisos
        </button>

        <button
          className={
            seccionActiva === "auditoria"
              ? "active"
              : ""
          }
          onClick={() =>
            setSeccionActiva("auditoria")
          }
        >
          Auditoría
        </button>

        <button
          className={
            seccionActiva === "configuracion"
              ? "active"
              : ""
          }
          onClick={() =>
            setSeccionActiva("configuracion")
          }
        >
          Configuración
        </button>

      </nav>

      {/* =====================================================
          USUARIOS
      ====================================================== */}

      {seccionActiva === "usuarios" && (
        <>
          <section className="administracion-kpis">

            <article className="administracion-kpi">
              <span>Total usuarios</span>

              <strong>
                {usuarios.length}
              </strong>

              <small>
                Registrados en el sistema
              </small>
            </article>

            <article className="administracion-kpi">
              <span>Activos</span>

              <strong>
                {
                  usuarios.filter(
                    (usuario) =>
                      usuario.estado === "activo"
                  ).length
                }
              </strong>

              <small>
                Con acceso habilitado
              </small>
            </article>

            <article className="administracion-kpi">
              <span>Inactivos</span>

              <strong>
                {
                  usuarios.filter(
                    (usuario) =>
                      usuario.estado === "inactivo"
                  ).length
                }
              </strong>

              <small>
                Sin acceso al sistema
              </small>
            </article>

            <article className="administracion-kpi">
              <span>Roles asignados</span>

              <strong>
                {
                  new Set(
                    usuarios.map(
                      (usuario) => usuario.rol
                    )
                  ).size
                }
              </strong>

              <small>
                Perfiles distintos
              </small>
            </article>

          </section>

          {/* FILTROS */}

          <section className="administracion-toolbar">

            <div className="administracion-filters">

              <button
                className={`filter-button ${
                  filtroEstado === "todos"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setFiltroEstado("todos")
                }
              >
                Todos
              </button>

              <button
                className={`filter-button ${
                  filtroEstado === "activo"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setFiltroEstado("activo")
                }
              >
                Activos
              </button>

              <button
                className={`filter-button ${
                  filtroEstado === "inactivo"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setFiltroEstado("inactivo")
                }
              >
                Inactivos
              </button>

            </div>

            <div className="administracion-search">

              <input
                type="text"
                placeholder="Buscar usuario..."
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
              />

            </div>

          </section>

          {/* TABLA */}

          <section className="administracion-panel">

            <div className="administracion-panel-header">

              <div>
                <h2>
                  Usuarios del sistema
                </h2>

                <p>
                  {usuariosFiltrados.length} usuarios encontrados
                </p>
              </div>

            </div>

            <div className="administracion-table-wrapper">

              <table className="administracion-table">

                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Último acceso</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>

                  {usuariosFiltrados.map(
                    (usuario) => (
                      <tr key={usuario.id}>

                        <td>
                          <strong>
                            {usuario.nombre}
                          </strong>
                        </td>

                        <td>
                          {usuario.email}
                        </td>

                        <td>
                          <span className="administracion-role-chip">
                            {usuario.rol}
                          </span>
                        </td>

                        <td>
                          {usuario.ultimoAcceso}
                        </td>

                        <td>
                          <span
                            className={`administracion-status ${usuario.estado}`}
                          >
                            {usuario.estado ===
                            "activo"
                              ? "Activo"
                              : "Inactivo"}
                          </span>
                        </td>

                        <td>
                          <button
                            className="administracion-detail-button"
                            onClick={() =>
                              setUsuarioSeleccionado(
                                usuario
                              )
                            }
                          >
                            Ver detalle
                          </button>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>
        </>
      )}

      {/* =====================================================
          ROLES Y PERMISOS
      ====================================================== */}

      {seccionActiva === "roles" && (
        <RolesPermisosSection />
      )}

      {/* =====================================================
          AUDITORÍA
      ====================================================== */}

      {seccionActiva === "auditoria" && (
        <AuditoriaSection />
      )}

      {/* =====================================================
          CONFIGURACIÓN
      ====================================================== */}

      {seccionActiva === "configuracion" && (
        <ConfiguracionSection />
      )}

      {/* =====================================================
          DRAWER DETALLE DE USUARIO
      ====================================================== */}

      {usuarioSeleccionado && (
        <>
          <div
            className="administracion-overlay"
            onClick={() =>
              setUsuarioSeleccionado(null)
            }
          ></div>

          <aside className="administracion-drawer">

            <div className="administracion-drawer-header">

              <div>
                <p className="page-eyebrow">
                  DETALLE DEL USUARIO
                </p>

                <h2>
                  {usuarioSeleccionado.nombre}
                </h2>

                <span>
                  {usuarioSeleccionado.email}
                </span>
              </div>

              <button
                className="drawer-close"
                onClick={() =>
                  setUsuarioSeleccionado(null)
                }
              >
                ×
              </button>

            </div>

            <div className="administracion-user-status">

              <span>
                Estado
              </span>

              <strong>
                {usuarioSeleccionado.estado ===
                "activo"
                  ? "Activo"
                  : "Inactivo"}
              </strong>

            </div>

            <div className="administracion-detail-grid">

              <div>
                <span>
                  Rol
                </span>

                <strong>
                  {usuarioSeleccionado.rol}
                </strong>
              </div>

              <div>
                <span>
                  Último acceso
                </span>

                <strong>
                  {usuarioSeleccionado.ultimoAcceso}
                </strong>
              </div>

            </div>

            {/* CAMBIAR ROL */}

            <div className="administracion-role-editor">

              <label>
                Cambiar rol

                <select
                  value={
                    usuarioSeleccionado.rol
                  }
                  onChange={(event) =>
                    cambiarRolUsuario(
                      event.target.value
                    )
                  }
                >
                  <option>
                    Administrador
                  </option>

                  <option>
                    Mesera
                  </option>

                  <option>
                    Mesero
                  </option>

                  <option>
                    Caja
                  </option>

                  <option>
                    Juegos
                  </option>
                </select>

              </label>

            </div>

            {/* ACTIVAR / DESACTIVAR */}

            <div className="administracion-user-actions">

              <button
                className={
                  usuarioSeleccionado.estado ===
                  "activo"
                    ? "administracion-deactivate-button"
                    : "drawer-primary-button"
                }
                onClick={() =>
                  cambiarEstadoUsuario(
                    usuarioSeleccionado.id
                  )
                }
              >
                {usuarioSeleccionado.estado ===
                "activo"
                  ? "Desactivar usuario"
                  : "Activar usuario"}
              </button>

            </div>

            <div className="administracion-readonly">
              Los usuarios no se eliminan físicamente. La
              desactivación conserva su historial y trazabilidad
              dentro del sistema.
            </div>

          </aside>
        </>
      )}

      {/* =====================================================
          DRAWER CREAR USUARIO
      ====================================================== */}

      {mostrarNuevoUsuario && (
        <>
          <div
            className="administracion-overlay"
            onClick={cerrarNuevoUsuario}
          ></div>

          <aside className="administracion-drawer">

            <div className="administracion-drawer-header">

              <div>
                <p className="page-eyebrow">
                  NUEVO USUARIO
                </p>

                <h2>
                  Crear usuario
                </h2>
              </div>

              <button
                className="drawer-close"
                onClick={cerrarNuevoUsuario}
              >
                ×
              </button>

            </div>

            <form
              className="administracion-form"
              onSubmit={crearUsuario}
            >

              <label>
                Nombre completo

                <input
                  type="text"
                  placeholder="Nombre del usuario"
                  value={nuevoUsuario.nombre}
                  onChange={(event) =>
                    setNuevoUsuario(
                      (actual) => ({
                        ...actual,
                        nombre:
                          event.target.value,
                      })
                    )
                  }
                />

              </label>

              <label>
                Correo electrónico

                <input
                  type="email"
                  placeholder="correo@dondejuanca.com"
                  value={nuevoUsuario.email}
                  onChange={(event) =>
                    setNuevoUsuario(
                      (actual) => ({
                        ...actual,
                        email:
                          event.target.value,
                      })
                    )
                  }
                />

              </label>

              <label>
                Rol

                <select
                  value={nuevoUsuario.rol}
                  onChange={(event) =>
                    setNuevoUsuario(
                      (actual) => ({
                        ...actual,
                        rol:
                          event.target.value,
                      })
                    )
                  }
                >
                  <option>
                    Administrador
                  </option>

                  <option>
                    Mesera
                  </option>

                  <option>
                    Mesero
                  </option>

                  <option>
                    Caja
                  </option>

                  <option>
                    Juegos
                  </option>
                </select>

              </label>

              <label>
                Contraseña temporal

                <input
                  type="password"
                  placeholder="Contraseña temporal"
                  value={nuevoUsuario.password}
                  onChange={(event) =>
                    setNuevoUsuario(
                      (actual) => ({
                        ...actual,
                        password:
                          event.target.value,
                      })
                    )
                  }
                />

              </label>

              <button
                type="submit"
                className="drawer-primary-button"
              >
                Crear usuario
              </button>

            </form>

          </aside>
        </>
      )}

    </div>
  );
}

export default AdministracionPage;