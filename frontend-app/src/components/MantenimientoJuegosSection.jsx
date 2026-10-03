import { useMemo, useState } from "react";
import "./MantenimientoJuegosSection.css";

function MantenimientoJuegosSection() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [mantenimientoSeleccionado, setMantenimientoSeleccionado] =
    useState(null);

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
  }, [mantenimientos, filtroTipo, filtroEstado, busqueda]);

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

  return (
    <div className="mantenimiento-juegos-section">

      <section className="mantenimiento-toolbar">

        <div className="mantenimiento-filters">

          <button
            className={`filter-button ${
              filtroTipo === "todos" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("todos")}
          >
            Todos
          </button>

          <button
            className={`filter-button ${
              filtroTipo === "preventivo" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("preventivo")}
          >
            Preventivo
          </button>

          <button
            className={`filter-button ${
              filtroTipo === "correctivo" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("correctivo")}
          >
            Correctivo
          </button>

        </div>

        <div className="mantenimiento-toolbar-right">

          <select
            value={filtroEstado}
            onChange={(event) =>
              setFiltroEstado(event.target.value)
            }
          >
            <option value="todos">Todos los estados</option>
            <option value="programado">Programado</option>
            <option value="en-proceso">En proceso</option>
            <option value="completado">Completado</option>
          </select>

          <input
            type="text"
            placeholder="Buscar mantenimiento..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />

          <button className="primary-button">
            + Registrar mantenimiento
          </button>

        </div>

      </section>

      <section className="mantenimiento-panel">

        <div className="mantenimiento-panel-header">
          <div>
            <h2>Historial de mantenimiento</h2>
            <p>
              {mantenimientosFiltrados.length} registros encontrados
            </p>
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

              {mantenimientosFiltrados.map((mantenimiento) => (
                <tr key={mantenimiento.id}>

                  <td>
                    <strong>{mantenimiento.codigo}</strong>
                  </td>

                  <td>{mantenimiento.juego}</td>

                  <td>
                    <span
                      className={`mantenimiento-type ${mantenimiento.tipo}`}
                    >
                      {nombreTipo(mantenimiento.tipo)}
                    </span>
                  </td>

                  <td>{mantenimiento.motivo}</td>

                  <td>{mantenimiento.fecha}</td>

                  <td>{mantenimiento.responsable}</td>

                  <td>
                    <span
                      className={`mantenimiento-status ${mantenimiento.estado}`}
                    >
                      {nombreEstado(mantenimiento.estado)}
                    </span>
                  </td>

                  <td>
                    <button
                      className="mantenimiento-detail-button"
                      onClick={() =>
                        setMantenimientoSeleccionado(mantenimiento)
                      }
                    >
                      Ver detalle
                    </button>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </section>

      {mantenimientoSeleccionado && (
        <>
          <div
            className="mantenimiento-overlay"
            onClick={() => setMantenimientoSeleccionado(null)}
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
                className="drawer-close"
                onClick={() => setMantenimientoSeleccionado(null)}
              >
                ×
              </button>

            </div>

            <div className="mantenimiento-detail-grid">

              <div>
                <span>Tipo</span>
                <strong>
                  {nombreTipo(
                    mantenimientoSeleccionado.tipo
                  )}
                </strong>
              </div>

              <div>
                <span>Estado</span>
                <strong>
                  {nombreEstado(
                    mantenimientoSeleccionado.estado
                  )}
                </strong>
              </div>

              <div>
                <span>Fecha</span>
                <strong>
                  {mantenimientoSeleccionado.fecha}
                </strong>
              </div>

              <div>
                <span>Responsable</span>
                <strong>
                  {mantenimientoSeleccionado.responsable}
                </strong>
              </div>

            </div>

            <div className="mantenimiento-reason">
              <span>Motivo</span>

              <p>
                {mantenimientoSeleccionado.motivo}
              </p>
            </div>

            <div className="mantenimiento-history">

              <h3>Historial de estados</h3>

              {mantenimientoSeleccionado.historial.map(
                (registro, index) => (
                  <div
                    key={index}
                    className="mantenimiento-history-row"
                  >
                    <div className="history-dot"></div>

                    <div>
                      <strong>{registro.estado}</strong>

                      <span>
                        {registro.fecha} · {registro.hora}
                      </span>
                    </div>
                  </div>
                )
              )}

            </div>

            {mantenimientoSeleccionado.estado === "programado" && (
              <button
                className="drawer-primary-button"
                onClick={() =>
                  cambiarEstado(
                    mantenimientoSeleccionado.id,
                    "en-proceso"
                  )
                }
              >
                Iniciar mantenimiento
              </button>
            )}

            {mantenimientoSeleccionado.estado === "en-proceso" && (
              <button
                className="drawer-primary-button"
                onClick={() =>
                  cambiarEstado(
                    mantenimientoSeleccionado.id,
                    "completado"
                  )
                }
              >
                Marcar como completado
              </button>
            )}

            {mantenimientoSeleccionado.estado === "completado" && (
              <div className="mantenimiento-complete-notice">
                Este mantenimiento fue completado y permanece disponible
                como registro histórico.
              </div>
            )}

          </aside>
        </>
      )}

    </div>
  );
}

export default MantenimientoJuegosSection;