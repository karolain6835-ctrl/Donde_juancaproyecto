import { useMemo, useState } from "react";
import "./HistorialJuegosSection.css";

function HistorialJuegosSection() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null);

  const sesiones = [
    {
      id: 1,
      codigo: "SES-090",
      fecha: "02/10/2026",
      hora: "14:10",
      juego: "Billar 1",
      tipo: "Billar",
      mesa: "Mesa 4",
      duracion: "1 h 12 min",
      responsable: "Carlos",
      costo: 21600,
      estado: "finalizada",
    },
    {
      id: 2,
      codigo: "SES-089",
      fecha: "02/10/2026",
      hora: "13:25",
      juego: "Tejo 1",
      tipo: "Tejo",
      mesa: "Mesa 7",
      duracion: "48 min",
      responsable: "Laura",
      costo: 12000,
      estado: "finalizada",
    },
    {
      id: 3,
      codigo: "SES-088",
      fecha: "01/10/2026",
      hora: "20:40",
      juego: "Billar 2",
      tipo: "Billar",
      mesa: "Mesa 2",
      duracion: "2 h 05 min",
      responsable: "Daniela",
      costo: 37500,
      estado: "finalizada",
    },
    {
      id: 4,
      codigo: "SES-087",
      fecha: "01/10/2026",
      hora: "18:15",
      juego: "Bolirana",
      tipo: "Bolirana",
      mesa: "Mesa 9",
      duracion: "35 min",
      responsable: "Carlos",
      costo: 7000,
      estado: "cancelada",
    },
  ];

  const sesionesFiltradas = useMemo(() => {
    return sesiones.filter((sesion) => {
      const coincideTipo =
        filtroTipo === "todos" || sesion.tipo.toLowerCase() === filtroTipo;

      const texto = busqueda.toLowerCase();

      const coincideBusqueda =
        sesion.codigo.toLowerCase().includes(texto) ||
        sesion.juego.toLowerCase().includes(texto) ||
        sesion.mesa.toLowerCase().includes(texto) ||
        sesion.responsable.toLowerCase().includes(texto);

      return coincideTipo && coincideBusqueda;
    });
  }, [busqueda, filtroTipo]);

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function nombreEstado(estado) {
    if (estado === "finalizada") return "Finalizada";
    if (estado === "cancelada") return "Cancelada";
    return estado;
  }

  return (
    <div className="historial-juegos-section">

      <section className="historial-juegos-toolbar">

        <div className="historial-juegos-filters">

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
              filtroTipo === "billar" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("billar")}
          >
            Billar
          </button>

          <button
            className={`filter-button ${
              filtroTipo === "tejo" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("tejo")}
          >
            Tejo
          </button>

          <button
            className={`filter-button ${
              filtroTipo === "bolirana" ? "active" : ""
            }`}
            onClick={() => setFiltroTipo("bolirana")}
          >
            Bolirana
          </button>

        </div>

        <div className="historial-juegos-search">
          <input
            type="text"
            placeholder="Buscar sesión, juego o mesa..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
        </div>

      </section>

      <section className="historial-juegos-panel">

        <div className="historial-juegos-panel-header">
          <div>
            <h2>Historial de sesiones</h2>
            <p>
              {sesionesFiltradas.length} sesiones encontradas
            </p>
          </div>
        </div>

        <div className="historial-juegos-table-wrapper">

          <table className="historial-juegos-table">

            <thead>
              <tr>
                <th>Sesión</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Juego</th>
                <th>Mesa</th>
                <th>Duración</th>
                <th>Responsable</th>
                <th>Costo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {sesionesFiltradas.map((sesion) => (
                <tr key={sesion.id}>

                  <td>
                    <strong>{sesion.codigo}</strong>
                  </td>

                  <td>{sesion.fecha}</td>

                  <td>{sesion.hora}</td>

                  <td>
                    <div className="historial-juego-name">
                      <strong>{sesion.juego}</strong>
                      <span>{sesion.tipo}</span>
                    </div>
                  </td>

                  <td>{sesion.mesa}</td>

                  <td>{sesion.duracion}</td>

                  <td>{sesion.responsable}</td>

                  <td>
                    <strong>
                      {formatearDinero(sesion.costo)}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={`historial-juego-status ${sesion.estado}`}
                    >
                      {nombreEstado(sesion.estado)}
                    </span>
                  </td>

                  <td>
                    <button
                      className="historial-juego-detail-button"
                      onClick={() =>
                        setSesionSeleccionada(sesion)
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

      {sesionSeleccionada && (
        <>
          <div
            className="historial-juego-overlay"
            onClick={() => setSesionSeleccionada(null)}
          ></div>

          <aside className="historial-juego-drawer">

            <div className="historial-juego-drawer-header">

              <div>
                <p className="page-eyebrow">
                  HISTORIAL DE JUEGO
                </p>

                <h2>
                  {sesionSeleccionada.juego}
                </h2>

                <span>
                  {sesionSeleccionada.codigo}
                </span>
              </div>

              <button
                className="drawer-close"
                onClick={() => setSesionSeleccionada(null)}
              >
                ×
              </button>

            </div>

            <div className="historial-juego-drawer-status">

              <span>Estado final</span>

              <strong>
                {nombreEstado(sesionSeleccionada.estado)}
              </strong>

            </div>

            <div className="historial-juego-detail-grid">

              <div>
                <span>Fecha</span>
                <strong>
                  {sesionSeleccionada.fecha}
                </strong>
              </div>

              <div>
                <span>Hora</span>
                <strong>
                  {sesionSeleccionada.hora}
                </strong>
              </div>

              <div>
                <span>Mesa</span>
                <strong>
                  {sesionSeleccionada.mesa}
                </strong>
              </div>

              <div>
                <span>Duración</span>
                <strong>
                  {sesionSeleccionada.duracion}
                </strong>
              </div>

              <div>
                <span>Responsable</span>
                <strong>
                  {sesionSeleccionada.responsable}
                </strong>
              </div>

              <div>
                <span>Costo final</span>
                <strong>
                  {formatearDinero(sesionSeleccionada.costo)}
                </strong>
              </div>

            </div>

            <div className="historial-juego-notice">
              Este registro pertenece al historial de sesiones y es de solo consulta.
            </div>

          </aside>
        </>
      )}

    </div>
  );
}

export default HistorialJuegosSection;