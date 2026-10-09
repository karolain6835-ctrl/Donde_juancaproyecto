import { useMemo, useState } from "react";

import {
  Search,
  ClipboardList,
  Users,
  Boxes,
  CalendarDays,
  SlidersHorizontal,
  UserRound,
  Layers3,
  Pencil,
  Plus,
  ArrowRight,
  X,
  LockKeyhole,
  History,
} from "lucide-react";

import "./AuditoriaSection.css";

function AuditoriaSection() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("todos");
  const [filtroModulo, setFiltroModulo] = useState("todos");
  const [filtroAccion, setFiltroAccion] = useState("todas");
  const [filtroFecha, setFiltroFecha] = useState("todas");
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

  const registros = [
    {
      id: "AUD-1041",
      usuario: "Karol",
      modulo: "Inventario",
      accion: "Editar",
      fecha: "02/10/2026",
      hora: "16:28",
      registro: "PROD-014",
      descripcion: "Actualización de stock mínimo del producto.",
      anterior: {
        stockMinimo: 10,
        estado: "Activo",
      },
      posterior: {
        stockMinimo: 15,
        estado: "Activo",
      },
    },
    {
      id: "AUD-1040",
      usuario: "Carlos Ruiz",
      modulo: "Pedidos",
      accion: "Crear",
      fecha: "02/10/2026",
      hora: "15:52",
      registro: "P-3848",
      descripcion: "Creación de nuevo pedido para Mesa 10.",
      anterior: null,
      posterior: {
        mesa: "Mesa 10",
        estado: "Abierto",
        total: "$42.000",
      },
    },
    {
      id: "AUD-1039",
      usuario: "Daniela Torres",
      modulo: "Caja",
      accion: "Crear",
      fecha: "02/10/2026",
      hora: "15:30",
      registro: "PG-899",
      descripcion: "Registro de pago asociado al pedido P-3845.",
      anterior: null,
      posterior: {
        metodo: "Tarjeta",
        valor: "$54.000",
        pedido: "P-3845",
      },
    },
    {
      id: "AUD-1038",
      usuario: "Karol",
      modulo: "Usuarios",
      accion: "Editar",
      fecha: "02/10/2026",
      hora: "14:18",
      registro: "USR-005",
      descripcion: "Cambio de estado de usuario.",
      anterior: {
        estado: "Activo",
        rol: "Juegos",
      },
      posterior: {
        estado: "Inactivo",
        rol: "Juegos",
      },
    },
    {
      id: "AUD-1037",
      usuario: "Laura Gómez",
      modulo: "Mesas",
      accion: "Editar",
      fecha: "01/10/2026",
      hora: "21:07",
      registro: "MESA-006",
      descripcion: "Cambio de estado de mesa a por cobrar.",
      anterior: {
        estado: "Ocupada",
      },
      posterior: {
        estado: "Por cobrar",
      },
    },
    {
      id: "AUD-1036",
      usuario: "Karol",
      modulo: "Compras",
      accion: "Crear",
      fecha: "01/10/2026",
      hora: "18:12",
      registro: "OC-208",
      descripcion: "Registro de nueva orden de compra.",
      anterior: null,
      posterior: {
        proveedor: "Dislicores Medellín",
        estado: "Pendiente",
        total: "$720.000",
      },
    },
  ];

  const usuarios = useMemo(() => {
    return [
      ...new Set(registros.map((registro) => registro.usuario)),
    ];
  }, [registros]);

  const modulos = useMemo(() => {
    return [
      ...new Set(registros.map((registro) => registro.modulo)),
    ];
  }, [registros]);

  const acciones = useMemo(() => {
    return [
      ...new Set(registros.map((registro) => registro.accion)),
    ];
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return registros.filter((registro) => {
      const coincideUsuario =
        filtroUsuario === "todos" ||
        registro.usuario === filtroUsuario;

      const coincideModulo =
        filtroModulo === "todos" ||
        registro.modulo === filtroModulo;

      const coincideAccion =
        filtroAccion === "todas" ||
        registro.accion === filtroAccion;

      const coincideFecha =
        filtroFecha === "todas" ||
        registro.fecha === filtroFecha;

      const coincideBusqueda =
        registro.id.toLowerCase().includes(texto) ||
        registro.usuario.toLowerCase().includes(texto) ||
        registro.modulo.toLowerCase().includes(texto) ||
        registro.accion.toLowerCase().includes(texto) ||
        registro.registro.toLowerCase().includes(texto) ||
        registro.descripcion.toLowerCase().includes(texto);

      return (
        coincideUsuario &&
        coincideModulo &&
        coincideAccion &&
        coincideFecha &&
        coincideBusqueda
      );
    });
  }, [
    busqueda,
    filtroUsuario,
    filtroModulo,
    filtroAccion,
    filtroFecha,
  ]);

  function renderObjeto(objeto) {
    if (!objeto) {
      return (
        <div className="auditoria-empty-value">
          Sin valor anterior
        </div>
      );
    }

    return Object.entries(objeto).map(([clave, valor]) => (
      <div
        key={clave}
        className="auditoria-change-row"
      >
        <span>
          {clave}
        </span>

        <strong>
          {String(valor)}
        </strong>
      </div>
    ));
  }

  return (
    <div className="auditoria-section">

      <section className="auditoria-toolbar">

        <div>
          <h2>
            Registro de auditoría
          </h2>

          <p>
            Consulta las acciones realizadas dentro del sistema.
          </p>
        </div>

        <div className="auditoria-search">

          <Search
            className="auditoria-search-icon"
            size={18}
            strokeWidth={1.9}
          />

          <input
            type="text"
            placeholder="Buscar registro..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
          />

        </div>

      </section>

      <section className="auditoria-kpis">

        <article className="auditoria-kpi">

          <div className="auditoria-kpi-icon events">
            <ClipboardList
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Eventos registrados
          </span>

          <strong>
            {registros.length}
          </strong>

          <small>
            Historial disponible
          </small>

        </article>

        <article className="auditoria-kpi">

          <div className="auditoria-kpi-icon users">
            <Users
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Usuarios involucrados
          </span>

          <strong>
            {usuarios.length}
          </strong>

          <small>
            Con actividad registrada
          </small>

        </article>

        <article className="auditoria-kpi">

          <div className="auditoria-kpi-icon modules">
            <Boxes
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Módulos afectados
          </span>

          <strong>
            {modulos.length}
          </strong>

          <small>
            Áreas con actividad
          </small>

        </article>

        <article className="auditoria-kpi">

          <div className="auditoria-kpi-icon today">
            <CalendarDays
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Eventos de hoy
          </span>

          <strong>
            {
              registros.filter(
                (registro) =>
                  registro.fecha === "02/10/2026"
              ).length
            }
          </strong>

          <small>
            2 de octubre de 2026
          </small>

        </article>

      </section>

      <section className="auditoria-filters">

        <div className="auditoria-filter-control">

          <UserRound
            size={15}
            strokeWidth={1.9}
          />

          <select
            value={filtroUsuario}
            onChange={(event) =>
              setFiltroUsuario(event.target.value)
            }
          >
            <option value="todos">
              Todos los usuarios
            </option>

            {usuarios.map((usuario) => (
              <option
                key={usuario}
                value={usuario}
              >
                {usuario}
              </option>
            ))}
          </select>

        </div>

        <div className="auditoria-filter-control">

          <Layers3
            size={15}
            strokeWidth={1.9}
          />

          <select
            value={filtroModulo}
            onChange={(event) =>
              setFiltroModulo(event.target.value)
            }
          >
            <option value="todos">
              Todos los módulos
            </option>

            {modulos.map((modulo) => (
              <option
                key={modulo}
                value={modulo}
              >
                {modulo}
              </option>
            ))}
          </select>

        </div>

        <div className="auditoria-filter-control">

          <SlidersHorizontal
            size={15}
            strokeWidth={1.9}
          />

          <select
            value={filtroAccion}
            onChange={(event) =>
              setFiltroAccion(event.target.value)
            }
          >
            <option value="todas">
              Todas las acciones
            </option>

            {acciones.map((accion) => (
              <option
                key={accion}
                value={accion}
              >
                {accion}
              </option>
            ))}
          </select>

        </div>

        <div className="auditoria-filter-control">

          <CalendarDays
            size={15}
            strokeWidth={1.9}
          />

          <select
            value={filtroFecha}
            onChange={(event) =>
              setFiltroFecha(event.target.value)
            }
          >
            <option value="todas">
              Todas las fechas
            </option>

            <option value="02/10/2026">
              02/10/2026
            </option>

            <option value="01/10/2026">
              01/10/2026
            </option>
          </select>

        </div>

      </section>

      <section className="auditoria-panel">

        <div className="auditoria-panel-header">

          <div className="auditoria-panel-title">

            <div className="auditoria-panel-icon">
              <History
                size={18}
                strokeWidth={1.9}
              />
            </div>

            <div>
              <h2>
                Actividad del sistema
              </h2>

              <p>
                {registrosFiltrados.length} registros encontrados
              </p>
            </div>

          </div>

          <span className="auditoria-readonly-badge">
            <LockKeyhole
              size={13}
              strokeWidth={1.9}
            />

            Solo consulta
          </span>

        </div>

        <div className="auditoria-table-wrapper">

          <table className="auditoria-table">

            <thead>
              <tr>
                <th>Evento</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Usuario</th>
                <th>Módulo</th>
                <th>Acción</th>
                <th>Registro</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {registrosFiltrados.map((registro) => (

                <tr key={registro.id}>

                  <td>
                    <span className="auditoria-event-code">
                      {registro.id}
                    </span>
                  </td>

                  <td>
                    {registro.fecha}
                  </td>

                  <td>
                    {registro.hora}
                  </td>

                  <td>
                    {registro.usuario}
                  </td>

                  <td>
                    <span className="auditoria-module-chip">
                      {registro.modulo}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`auditoria-action ${registro.accion.toLowerCase()}`}
                    >
                      {registro.accion === "Crear" ? (
                        <Plus
                          size={12}
                          strokeWidth={1.9}
                        />
                      ) : (
                        <Pencil
                          size={12}
                          strokeWidth={1.9}
                        />
                      )}

                      {registro.accion}
                    </span>
                  </td>

                  <td>
                    {registro.registro}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="auditoria-detail-button"
                      onClick={() =>
                        setRegistroSeleccionado(registro)
                      }
                    >
                      Ver detalle

                      <ArrowRight
                        size={15}
                        strokeWidth={1.9}
                      />
                    </button>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>

      {registroSeleccionado && (
        <>

          <div
            className="auditoria-overlay"
            onClick={() =>
              setRegistroSeleccionado(null)
            }
          ></div>

          <aside className="auditoria-drawer">

            <div className="auditoria-drawer-header">

              <div>
                <p className="page-eyebrow">
                  EVENTO DE AUDITORÍA
                </p>

                <h2>
                  {registroSeleccionado.id}
                </h2>

                <span>
                  {registroSeleccionado.fecha} ·{" "}
                  {registroSeleccionado.hora}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setRegistroSeleccionado(null)
                }
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div className="auditoria-detail-grid">

              <div>
                <span>
                  Usuario
                </span>

                <strong>
                  <UserRound
                    size={14}
                    strokeWidth={1.9}
                  />

                  {registroSeleccionado.usuario}
                </strong>
              </div>

              <div>
                <span>
                  Módulo
                </span>

                <strong>
                  <Layers3
                    size={14}
                    strokeWidth={1.9}
                  />

                  {registroSeleccionado.modulo}
                </strong>
              </div>

              <div>
                <span>
                  Acción
                </span>

                <strong>
                  {registroSeleccionado.accion === "Crear" ? (
                    <Plus
                      size={14}
                      strokeWidth={1.9}
                    />
                  ) : (
                    <Pencil
                      size={14}
                      strokeWidth={1.9}
                    />
                  )}

                  {registroSeleccionado.accion}
                </strong>
              </div>

              <div>
                <span>
                  Registro afectado
                </span>

                <strong>
                  <ClipboardList
                    size={14}
                    strokeWidth={1.9}
                  />

                  {registroSeleccionado.registro}
                </strong>
              </div>

            </div>

            <div className="auditoria-description">

              <span>
                Descripción
              </span>

              <p>
                {registroSeleccionado.descripcion}
              </p>

            </div>

            <div className="auditoria-comparison">

              <div className="auditoria-value-box before">

                <div className="auditoria-value-heading">
                  <History
                    size={15}
                    strokeWidth={1.9}
                  />

                  <h3>
                    Antes
                  </h3>
                </div>

                {renderObjeto(
                  registroSeleccionado.anterior
                )}

              </div>

              <div className="auditoria-value-box after">

                <div className="auditoria-value-heading">
                  <ArrowRight
                    size={15}
                    strokeWidth={1.9}
                  />

                  <h3>
                    Después
                  </h3>
                </div>

                {renderObjeto(
                  registroSeleccionado.posterior
                )}

              </div>

            </div>

            <div className="auditoria-readonly">

              <LockKeyhole
                size={17}
                strokeWidth={1.9}
              />

              <span>
                Los registros de auditoría son de solo consulta. No deben modificarse ni eliminarse desde la interfaz administrativa.
              </span>

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

export default AuditoriaSection;