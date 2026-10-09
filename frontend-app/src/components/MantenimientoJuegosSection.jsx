import { useMemo, useState } from "react";

import {
  Search,
  Wrench,
  ShieldCheck,
  TriangleAlert,
  CalendarDays,
  UserRound,
  ArrowRight,
  X,
  Play,
  CircleCheck,
  Plus,
  Clock3,
  History,
  SlidersHorizontal,
} from "lucide-react";

import "./MantenimientoJuegosSection.css";

function MantenimientoJuegosSection() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [
    mantenimientoSeleccionado,
    setMantenimientoSeleccionado,
  ] = useState(null);

  const [mantenimientos, setMantenimientos] = useState([
    {
      id: 1,
      codigo: "MAN-001",
      juego: "Bolirana",
      tipo: "correctivo",
      motivo: "Falla en mecanismo de retorno",
      fecha: "02/10/2026",
      responsable: "Carlos",
      estado: "en-proceso",
      historial: [
        {
          estado: "Programado",
          fecha: "01/10/2026",
          hora: "18:20",
        },
        {
          estado: "En proceso",
          fecha: "02/10/2026",
          hora: "09:10",
        },
      ],
    },
    {
      id: 2,
      codigo: "MAN-002",
      juego: "Billar 2",
      tipo: "preventivo",
      motivo: "Revisión general y nivelación",
      fecha: "04/10/2026",
      responsable: "Karol",
      estado: "programado",
      historial: [
        {
          estado: "Programado",
          fecha: "02/10/2026",
          hora: "11:30",
        },
      ],
    },
    {
      id: 3,
      codigo: "MAN-003",
      juego: "Tejo 1",
      tipo: "preventivo",
      motivo: "Limpieza y revisión de superficie",
      fecha: "30/09/2026",
      responsable: "Daniela",
      estado: "completado",
      historial: [
        {
          estado: "Programado",
          fecha: "28/09/2026",
          hora: "15:00",
        },
        {
          estado: "En proceso",
          fecha: "30/09/2026",
          hora: "08:15",
        },
        {
          estado: "Completado",
          fecha: "30/09/2026",
          hora: "10:42",
        },
      ],
    },
  ]);

  const mantenimientosFiltrados = useMemo(() => {
    return mantenimientos.filter((mantenimiento) => {
      const coincideTipo =
        filtroTipo === "todos" ||
        mantenimiento.tipo === filtroTipo;

      const coincideEstado =
        filtroEstado === "todos" ||
        mantenimiento.estado === filtroEstado;

      const texto = busqueda.toLowerCase();

      const coincideBusqueda =
        mantenimiento.codigo.toLowerCase().includes(texto) ||
        mantenimiento.juego.toLowerCase().includes(texto) ||
        mantenimiento.responsable.toLowerCase().includes(texto) ||
        mantenimiento.motivo.toLowerCase().includes(texto);

      return coincideTipo && coincideEstado && coincideBusqueda;
    });
  }, [
    mantenimientos,
    filtroTipo,
    filtroEstado,
    busqueda,
  ]);

  function nombreTipo(tipo) {
    if (tipo === "preventivo") return "Preventivo";
    if (tipo === "correctivo") return "Correctivo";

    return tipo;
  }

  function nombreEstado(estado) {
    if (estado === "programado") return "Programado";
    if (estado === "en-proceso") return "En proceso";
    if (estado === "completado") return "Completado";

    return estado;
  }

  function cambiarEstado(id, nuevoEstado) {
    const fechaActual = "02/10/2026";
    const horaActual = "16:45";

    setMantenimientos((actuales) =>
      actuales.map((mantenimiento) =>
        mantenimiento.id === id
          ? {
              ...mantenimiento,
              estado: nuevoEstado,
              historial: [
                ...mantenimiento.historial,
                {
                  estado: nombreEstado(nuevoEstado),
                  fecha: fechaActual,
                  hora: horaActual,
                },
              ],
            }
          : mantenimiento
      )
    );

    setMantenimientoSeleccionado((actual) =>
      actual && actual.id === id
        ? {
            ...actual,
            estado: nuevoEstado,
            historial: [
              ...actual.historial,
              {
                estado: nombreEstado(nuevoEstado),
                fecha: fechaActual,
                hora: horaActual,
              },
            ],
          }
        : actual
    );
  }

  function iconoTipo(tipo) {
    if (tipo === "preventivo") {
      return (
        <ShieldCheck
          size={14}
          strokeWidth={1.9}
        />
      );
    }

    return (
      <TriangleAlert
        size={14}
        strokeWidth={1.9}
      />
    );
  }

  return (
    <div className="mantenimiento-juegos-section">

      <section className="mantenimiento-toolbar">

        <div className="mantenimiento-filters">

          <button
            type="button"
            className={`filter-button ${
              filtroTipo === "todos" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("todos")}
          >
            Todos
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroTipo === "preventivo" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("preventivo")}
          >
            <ShieldCheck
              size={14}
              strokeWidth={1.9}
            />

            Preventivo
          </button>

          <button
            type="button"
            className={`filter-button ${
              filtroTipo === "correctivo" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("correctivo")}
          >
            <TriangleAlert
              size={14}
              strokeWidth={1.9}
            />

            Correctivo
          </button>

        </div>

        <div className="mantenimiento-toolbar-right">

          <div className="mantenimiento-select-wrapper">

            <SlidersHorizontal
              size={16}
              strokeWidth={1.9}
            />

            <select
              value={filtroEstado}
              onChange={(event) =>
                setFiltroEstado(event.target.value)
              }
            >
              <option value="todos">
                Todos los estados
              </option>

              <option value="programado">
                Programado
              </option>

              <option value="en-proceso">
                En proceso
              </option>

              <option value="completado">
                Completado
              </option>
            </select>

          </div>

          <div className="mantenimiento-search">

            <Search
              size={17}
              strokeWidth={1.9}
            />

            <input
              type="text"
              placeholder="Buscar mantenimiento..."
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
            />

          </div>

          <button
            type="button"
            className="primary-button mantenimiento-register-button"
          >
            <Plus
              size={17}
              strokeWidth={1.9}
            />

            Registrar mantenimiento
          </button>

        </div>

      </section>

      <section className="mantenimiento-panel">

        <div className="mantenimiento-panel-header">

          <div className="mantenimiento-panel-title">

            <div className="mantenimiento-panel-icon">
              <Wrench
                size={18}
                strokeWidth={1.9}
              />
            </div>

            <div>
              <h2>
                Historial de mantenimiento
              </h2>

              <p>
                {mantenimientosFiltrados.length} registros encontrados
              </p>
            </div>

          </div>

        </div>

        <div className="mantenimiento-table-wrapper">

          <table className="mantenimiento-table">

            <thead>
              <tr>
                <th>Registro</th>
                <th>Juego</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Fecha</th>
                <th>Responsable</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {mantenimientosFiltrados.map(
                (mantenimiento) => (

                  <tr key={mantenimiento.id}>

                    <td>
                      <span className="mantenimiento-code">
                        {mantenimiento.codigo}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {mantenimiento.juego}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`mantenimiento-type ${mantenimiento.tipo}`}
                      >
                        {iconoTipo(mantenimiento.tipo)}

                        {nombreTipo(
                          mantenimiento.tipo
                        )}
                      </span>
                    </td>

                    <td>
                      {mantenimiento.motivo}
                    </td>

                    <td>
                      {mantenimiento.fecha}
                    </td>

                    <td>
                      {mantenimiento.responsable}
                    </td>

                    <td>
                      <span
                        className={`mantenimiento-status ${mantenimiento.estado}`}
                      >
                        {nombreEstado(
                          mantenimiento.estado
                        )}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="mantenimiento-detail-button"
                        onClick={() =>
                          setMantenimientoSeleccionado(
                            mantenimiento
                          )
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

                )
              )}

            </tbody>

          </table>

        </div>

      </section>

      {mantenimientoSeleccionado && (
        <>

          <div
            className="mantenimiento-overlay"
            onClick={() =>
              setMantenimientoSeleccionado(null)
            }
          ></div>

          <aside className="mantenimiento-drawer">

            <div className="mantenimiento-drawer-header">

              <div>
                <p className="page-eyebrow">
                  MANTENIMIENTO
                </p>

                <h2>
                  {mantenimientoSeleccionado.juego}
                </h2>

                <span>
                  {mantenimientoSeleccionado.codigo}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setMantenimientoSeleccionado(null)
                }
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div
              className={`mantenimiento-drawer-status ${mantenimientoSeleccionado.estado}`}
            >

              <span>
                Estado actual
              </span>

              <strong>
                {nombreEstado(
                  mantenimientoSeleccionado.estado
                )}
              </strong>

            </div>

            <div className="mantenimiento-detail-grid">

              <div>
                <span>
                  Tipo
                </span>

                <strong>
                  {iconoTipo(
                    mantenimientoSeleccionado.tipo
                  )}

                  {nombreTipo(
                    mantenimientoSeleccionado.tipo
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Estado
                </span>

                <strong>
                  <Wrench
                    size={14}
                    strokeWidth={1.9}
                  />

                  {nombreEstado(
                    mantenimientoSeleccionado.estado
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Fecha
                </span>

                <strong>
                  <CalendarDays
                    size={14}
                    strokeWidth={1.9}
                  />

                  {mantenimientoSeleccionado.fecha}
                </strong>
              </div>

              <div>
                <span>
                  Responsable
                </span>

                <strong>
                  <UserRound
                    size={14}
                    strokeWidth={1.9}
                  />

                  {mantenimientoSeleccionado.responsable}
                </strong>
              </div>

            </div>

            <div className="mantenimiento-reason">

              <span>
                Motivo
              </span>

              <p>
                {mantenimientoSeleccionado.motivo}
              </p>

            </div>

            <div className="mantenimiento-history">

              <div className="mantenimiento-history-heading">

                <History
                  size={17}
                  strokeWidth={1.9}
                />

                <h3>
                  Historial de estados
                </h3>

              </div>

              {mantenimientoSeleccionado.historial.map(
                (registro, index) => (

                  <div
                    key={index}
                    className="mantenimiento-history-row"
                  >

                    <div className="history-marker">

                      <span className="history-dot"></span>

                      {index <
                        mantenimientoSeleccionado.historial.length -
                          1 && (
                        <span className="history-line"></span>
                      )}

                    </div>

                    <div>
                      <strong>
                        {registro.estado}
                      </strong>

                      <span>
                        <Clock3
                          size={12}
                          strokeWidth={1.9}
                        />

                        {registro.fecha} · {registro.hora}
                      </span>
                    </div>

                  </div>

                )
              )}

            </div>

            {mantenimientoSeleccionado.estado ===
              "programado" && (

              <button
                type="button"
                className="drawer-primary-button mantenimiento-main-action"
                onClick={() =>
                  cambiarEstado(
                    mantenimientoSeleccionado.id,
                    "en-proceso"
                  )
                }
              >
                <Play
                  size={17}
                  strokeWidth={1.9}
                />

                Iniciar mantenimiento
              </button>

            )}

            {mantenimientoSeleccionado.estado ===
              "en-proceso" && (

              <button
                type="button"
                className="drawer-primary-button mantenimiento-main-action"
                onClick={() =>
                  cambiarEstado(
                    mantenimientoSeleccionado.id,
                    "completado"
                  )
                }
              >
                <CircleCheck
                  size={17}
                  strokeWidth={1.9}
                />

                Marcar como completado
              </button>

            )}

            {mantenimientoSeleccionado.estado ===
              "completado" && (

              <div className="mantenimiento-complete-notice">

                <CircleCheck
                  size={17}
                  strokeWidth={1.9}
                />

                <span>
                  Este mantenimiento fue completado y permanece disponible como registro histórico.
                </span>

              </div>

            )}

          </aside>

        </>
      )}

    </div>
  );
}

export default MantenimientoJuegosSection;