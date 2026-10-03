import { useMemo, useState } from "react";
import "./RolesPermisosSection.css";

function RolesPermisosSection() {
  const [rolSeleccionado, setRolSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  const [roles, setRoles] = useState([
    {
      id: 1,
      nombre: "Administrador",
      descripcion: "Acceso completo al sistema.",
      usuarios: 1,
      estado: "activo",
      permisos: {
        Dashboard: ["ver"],
        Operación: ["ver", "crear", "editar", "administrar"],
        Inventario: ["ver", "crear", "editar", "administrar"],
        Compras: ["ver", "crear", "editar", "administrar"],
        Juegos: ["ver", "crear", "editar", "administrar"],
        Caja: ["ver", "crear", "editar", "administrar"],
        Clientes: ["ver", "crear", "editar", "administrar"],
        Reportes: ["ver", "administrar"],
        Administración: ["ver", "crear", "editar", "administrar"],
      },
    },
    {
      id: 2,
      nombre: "Mesera",
      descripcion: "Gestión operativa de mesas y pedidos.",
      usuarios: 1,
      estado: "activo",
      permisos: {
        Dashboard: ["ver"],
        Operación: ["ver", "crear", "editar"],
        Inventario: ["ver"],
        Compras: [],
        Juegos: ["ver"],
        Caja: ["ver"],
        Clientes: ["ver", "crear"],
        Reportes: [],
        Administración: [],
      },
    },
    {
      id: 3,
      nombre: "Mesero",
      descripcion: "Atención de mesas y gestión de pedidos.",
      usuarios: 1,
      estado: "activo",
      permisos: {
        Dashboard: ["ver"],
        Operación: ["ver", "crear", "editar"],
        Inventario: ["ver"],
        Compras: [],
        Juegos: ["ver"],
        Caja: ["ver"],
        Clientes: ["ver", "crear"],
        Reportes: [],
        Administración: [],
      },
    },
    {
      id: 4,
      nombre: "Caja",
      descripcion: "Gestión de pagos, cuentas y cierres.",
      usuarios: 1,
      estado: "activo",
      permisos: {
        Dashboard: ["ver"],
        Operación: ["ver"],
        Inventario: ["ver"],
        Compras: [],
        Juegos: ["ver"],
        Caja: ["ver", "crear", "editar", "administrar"],
        Clientes: ["ver"],
        Reportes: ["ver"],
        Administración: [],
      },
    },
    {
      id: 5,
      nombre: "Juegos",
      descripcion: "Gestión operativa de juegos y sesiones.",
      usuarios: 1,
      estado: "activo",
      permisos: {
        Dashboard: ["ver"],
        Operación: ["ver"],
        Inventario: [],
        Compras: [],
        Juegos: ["ver", "crear", "editar"],
        Caja: [],
        Clientes: [],
        Reportes: [],
        Administración: [],
      },
    },
  ]);

  const rolesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return roles.filter(
      (rol) =>
        rol.nombre.toLowerCase().includes(texto) ||
        rol.descripcion.toLowerCase().includes(texto)
    );
  }, [roles, busqueda]);

  const acciones = ["ver", "crear", "editar", "administrar"];

  function tienePermiso(rol, modulo, accion) {
    return rol.permisos[modulo]?.includes(accion);
  }

  function alternarPermiso(modulo, accion) {
    if (!rolSeleccionado) return;

    const permisosActuales =
      rolSeleccionado.permisos[modulo] || [];

    const nuevosPermisos = permisosActuales.includes(accion)
      ? permisosActuales.filter(
          (permiso) => permiso !== accion
        )
      : [...permisosActuales, accion];

    const nuevoRol = {
      ...rolSeleccionado,
      permisos: {
        ...rolSeleccionado.permisos,
        [modulo]: nuevosPermisos,
      },
    };

    setRolSeleccionado(nuevoRol);

    setRoles((actuales) =>
      actuales.map((rol) =>
        rol.id === nuevoRol.id ? nuevoRol : rol
      )
    );
  }

  function cambiarEstadoRol(id) {
    setRoles((actuales) =>
      actuales.map((rol) =>
        rol.id === id
          ? {
              ...rol,
              estado:
                rol.estado === "activo"
                  ? "inactivo"
                  : "activo",
            }
          : rol
      )
    );

    setRolSeleccionado((actual) =>
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

  return (
    <div className="roles-permisos-section">

      <section className="roles-toolbar">

        <div>
          <h2>Roles del sistema</h2>
          <p>
            Define qué puede consultar y gestionar cada perfil.
          </p>
        </div>

        <div className="roles-search">
          <input
            type="text"
            placeholder="Buscar rol..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
          />
        </div>

      </section>

      <section className="roles-summary">

        <article>
          <span>Roles registrados</span>
          <strong>{roles.length}</strong>
        </article>

        <article>
          <span>Roles activos</span>
          <strong>
            {
              roles.filter(
                (rol) => rol.estado === "activo"
              ).length
            }
          </strong>
        </article>

        <article>
          <span>Usuarios asignados</span>
          <strong>
            {roles.reduce(
              (total, rol) => total + rol.usuarios,
              0
            )}
          </strong>
        </article>

      </section>

      <section className="roles-grid">

        {rolesFiltrados.map((rol) => {
          const cantidadPermisos = Object.values(
            rol.permisos
          ).reduce(
            (total, permisos) =>
              total + permisos.length,
            0
          );

          return (
            <article
              key={rol.id}
              className="rol-card"
            >

              <div className="rol-card-header">

                <div>
                  <h3>{rol.nombre}</h3>

                  <span
                    className={`rol-status ${rol.estado}`}
                  >
                    {rol.estado === "activo"
                      ? "Activo"
                      : "Inactivo"}
                  </span>
                </div>

              </div>

              <p>{rol.descripcion}</p>

              <div className="rol-card-stats">

                <div>
                  <span>Usuarios</span>
                  <strong>{rol.usuarios}</strong>
                </div>

                <div>
                  <span>Permisos</span>
                  <strong>{cantidadPermisos}</strong>
                </div>

              </div>

              <button
                className="rol-detail-button"
                onClick={() =>
                  setRolSeleccionado(rol)
                }
              >
                Ver permisos
              </button>

            </article>
          );
        })}

      </section>

      {rolSeleccionado && (
        <>
          <div
            className="rol-overlay"
            onClick={() =>
              setRolSeleccionado(null)
            }
          ></div>

          <aside className="rol-drawer">

            <div className="rol-drawer-header">

              <div>
                <p className="page-eyebrow">
                  ROL Y PERMISOS
                </p>

                <h2>
                  {rolSeleccionado.nombre}
                </h2>

                <span>
                  {rolSeleccionado.descripcion}
                </span>
              </div>

              <button
                className="drawer-close"
                onClick={() =>
                  setRolSeleccionado(null)
                }
              >
                ×
              </button>

            </div>

            <div className="rol-drawer-summary">

              <div>
                <span>Usuarios asignados</span>
                <strong>
                  {rolSeleccionado.usuarios}
                </strong>
              </div>

              <div>
                <span>Estado</span>
                <strong>
                  {rolSeleccionado.estado === "activo"
                    ? "Activo"
                    : "Inactivo"}
                </strong>
              </div>

            </div>

            <div className="rol-permissions">

              <h3>Permisos por módulo</h3>

              {Object.keys(
                rolSeleccionado.permisos
              ).map((modulo) => (
                <div
                  key={modulo}
                  className="rol-permission-module"
                >

                  <strong>{modulo}</strong>

                  <div className="rol-permission-actions">

                    {acciones.map((accion) => (
                      <label key={accion}>

                        <input
                          type="checkbox"
                          checked={tienePermiso(
                            rolSeleccionado,
                            modulo,
                            accion
                          )}
                          onChange={() =>
                            alternarPermiso(
                              modulo,
                              accion
                            )
                          }
                        />

                        <span>
                          {accion.charAt(0).toUpperCase() +
                            accion.slice(1)}
                        </span>

                      </label>
                    ))}

                  </div>

                </div>
              ))}

            </div>

            <button
              className={
                rolSeleccionado.estado === "activo"
                  ? "rol-deactivate-button"
                  : "drawer-primary-button"
              }
              onClick={() =>
                cambiarEstadoRol(
                  rolSeleccionado.id
                )
              }
            >
              {rolSeleccionado.estado === "activo"
                ? "Desactivar rol"
                : "Activar rol"}
            </button>

            <div className="rol-notice">
              Los cambios realizados aquí son simulados en React. Cuando
              conectemos el backend, los permisos deberán validarse también
              en el servidor y no únicamente en la interfaz.
            </div>

          </aside>
        </>
      )}

    </div>
  );
}

export default RolesPermisosSection;