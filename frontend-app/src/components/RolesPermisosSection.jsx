import { useMemo, useState } from "react";

import {
  ShieldCheck,
  Users,
  KeyRound,
  Search,
  UserCheck,
  UserX,
  Eye,
  Plus,
  Pencil,
  Settings2,
  ArrowRight,
  X,
  LockKeyhole,
  Power,
  PowerOff,
} from "lucide-react";

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

  function iconoAccion(accion) {
    if (accion === "ver") {
      return <Eye size={13} strokeWidth={1.9} />;
    }

    if (accion === "crear") {
      return <Plus size={13} strokeWidth={1.9} />;
    }

    if (accion === "editar") {
      return <Pencil size={13} strokeWidth={1.9} />;
    }

    return <Settings2 size={13} strokeWidth={1.9} />;
  }

  return (
    <div className="roles-permisos-section">

      <section className="roles-toolbar">

        <div>
          <h2>
            Roles del sistema
          </h2>

          <p>
            Define qué puede consultar y gestionar cada perfil.
          </p>
        </div>

        <div className="roles-search">

          <Search
            className="roles-search-icon"
            size={18}
            strokeWidth={1.9}
          />

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

          <div className="roles-summary-icon total">
            <ShieldCheck
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Roles registrados
          </span>

          <strong>
            {roles.length}
          </strong>

        </article>

        <article>

          <div className="roles-summary-icon active">
            <UserCheck
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Roles activos
          </span>

          <strong>
            {
              roles.filter(
                (rol) => rol.estado === "activo"
              ).length
            }
          </strong>

        </article>

        <article>

          <div className="roles-summary-icon users">
            <Users
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Usuarios asignados
          </span>

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

                  <div className="rol-card-title">

                    <span className="rol-card-icon">
                      <ShieldCheck
                        size={18}
                        strokeWidth={1.9}
                      />
                    </span>

                    <h3>
                      {rol.nombre}
                    </h3>

                  </div>

                  <span
                    className={`rol-status ${rol.estado}`}
                  >
                    {rol.estado === "activo"
                      ? "Activo"
                      : "Inactivo"}
                  </span>

                </div>

              </div>

              <p>
                {rol.descripcion}
              </p>

              <div className="rol-card-stats">

                <div>
                  <span>
                    Usuarios
                  </span>

                  <strong>
                    {rol.usuarios}
                  </strong>
                </div>

                <div>
                  <span>
                    Permisos
                  </span>

                  <strong>
                    {cantidadPermisos}
                  </strong>
                </div>

              </div>

              <button
                type="button"
                className="rol-detail-button"
                onClick={() =>
                  setRolSeleccionado(rol)
                }
              >
                <KeyRound
                  size={15}
                  strokeWidth={1.9}
                />

                Ver permisos

                <ArrowRight
                  size={15}
                  strokeWidth={1.9}
                />
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
                type="button"
                className="drawer-close"
                onClick={() =>
                  setRolSeleccionado(null)
                }
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div className="rol-drawer-summary">

              <div>
                <span>
                  Usuarios asignados
                </span>

                <strong>
                  <Users
                    size={14}
                    strokeWidth={1.9}
                  />

                  {rolSeleccionado.usuarios}
                </strong>
              </div>

              <div>
                <span>
                  Estado
                </span>

                <strong
                  className={
                    rolSeleccionado.estado === "activo"
                      ? "rol-summary-active"
                      : "rol-summary-inactive"
                  }
                >
                  {rolSeleccionado.estado === "activo" ? (
                    <>
                      <UserCheck
                        size={14}
                        strokeWidth={1.9}
                      />
                      Activo
                    </>
                  ) : (
                    <>
                      <UserX
                        size={14}
                        strokeWidth={1.9}
                      />
                      Inactivo
                    </>
                  )}
                </strong>
              </div>

            </div>

            <div className="rol-permissions">

              <div className="rol-permissions-heading">

                <KeyRound
                  size={17}
                  strokeWidth={1.9}
                />

                <h3>
                  Permisos por módulo
                </h3>

              </div>

              {Object.keys(
                rolSeleccionado.permisos
              ).map((modulo) => (

                <div
                  key={modulo}
                  className="rol-permission-module"
                >

                  <strong>
                    {modulo}
                  </strong>

                  <div className="rol-permission-actions">

                    {acciones.map((accion) => {

                      const activo = tienePermiso(
                        rolSeleccionado,
                        modulo,
                        accion
                      );

                      return (
                        <label
                          key={accion}
                          className={
                            activo
                              ? "permission-active"
                              : ""
                          }
                        >

                          <input
                            type="checkbox"
                            checked={activo}
                            onChange={() =>
                              alternarPermiso(
                                modulo,
                                accion
                              )
                            }
                          />

                          {iconoAccion(accion)}

                          <span>
                            {accion.charAt(0).toUpperCase() +
                              accion.slice(1)}
                          </span>

                        </label>
                      );
                    })}

                  </div>

                </div>

              ))}

            </div>

            <button
              type="button"
              className={
                rolSeleccionado.estado === "activo"
                  ? "rol-deactivate-button"
                  : "drawer-primary-button rol-activate-button"
              }
              onClick={() =>
                cambiarEstadoRol(
                  rolSeleccionado.id
                )
              }
            >
              {rolSeleccionado.estado === "activo" ? (
                <>
                  <PowerOff
                    size={17}
                    strokeWidth={1.9}
                  />

                  Desactivar rol
                </>
              ) : (
                <>
                  <Power
                    size={17}
                    strokeWidth={1.9}
                  />

                  Activar rol
                </>
              )}
            </button>

            <div className="rol-notice">

              <LockKeyhole
                size={17}
                strokeWidth={1.9}
              />

              <span>
                Los cambios realizados aquí son simulados en React. Cuando conectemos el backend, los permisos deberán validarse también en el servidor y no únicamente en la interfaz.
              </span>

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

export default RolesPermisosSection;