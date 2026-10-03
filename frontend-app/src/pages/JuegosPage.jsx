import { useMemo, useState } from "react";
import SesionesJuegosSection from "../components/SesionesJuegosSection";
import HistorialJuegosSection from "../components/HistorialJuegosSection";
import MantenimientoJuegosSection from "../components/MantenimientoJuegosSection";
import "./JuegosPage.css";

function JuegosPage() {
  const [seccionActiva, setSeccionActiva] = useState("activos");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [juegoSeleccionado, setJuegoSeleccionado] = useState(null);

  const juegos = [
    {
      id: 1,
      codigo: "JUE-001",
      nombre: "Billar 1",
      tipo: "Billar",
      estado: "ocupado",
      precioHora: 18000,
      mesa: "Mesa 4",
    },
    {
      id: 2,
      codigo: "JUE-002",
      nombre: "Billar 2",
      tipo: "Billar",
      estado: "disponible",
      precioHora: 18000,
      mesa: null,
    },
    {
      id: 3,
      codigo: "JUE-003",
      nombre: "Tejo 1",
      tipo: "Tejo",
      estado: "disponible",
      precioHora: 15000,
      mesa: null,
    },
    {
      id: 4,
      codigo: "JUE-004",
      nombre: "Tejo 2",
      tipo: "Tejo",
      estado: "ocupado",
      precioHora: 15000,
      mesa: "Mesa 8",
    },
    {
      id: 5,
      codigo: "JUE-005",
      nombre: "Bolirana",
      tipo: "Bolirana",
      estado: "mantenimiento",
      precioHora: 12000,
      mesa: null,
    },
  ];

  const juegosFiltrados = useMemo(() => {
    return juegos.filter((juego) => {
      const coincideEstado =
        filtroEstado === "todos" || juego.estado === filtroEstado;

      const texto = busqueda.toLowerCase();

      const coincideBusqueda =
        juego.nombre.toLowerCase().includes(texto) ||
        juego.codigo.toLowerCase().includes(texto) ||
        juego.tipo.toLowerCase().includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [busqueda, filtroEstado]);

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function nombreEstado(estado) {
    if (estado === "disponible") return "Disponible";
    if (estado === "ocupado") return "Ocupado";
    if (estado === "mantenimiento") return "Mantenimiento";
    return estado;
  }

  return (
    <div className="juegos-page">

      <header className="juegos-header">
        <div>
          <p className="page-eyebrow">JUEGOS</p>

          <h1 className="page-title">
            {seccionActiva === "activos" && "Activos"}
            {seccionActiva === "sesiones" && "Sesiones activas"}
            {seccionActiva === "historial" && "Historial"}
            {seccionActiva === "mantenimiento" && "Mantenimiento"}
          </h1>

          <p className="page-description">
            Gestiona los juegos y sesiones de Donde Juanca.
          </p>
        </div>
      </header>

      <nav className="juegos-nav">

        <button
          className={seccionActiva === "activos" ? "active" : ""}
          onClick={() => setSeccionActiva("activos")}
        >
          Activos
        </button>

        <button
          className={seccionActiva === "sesiones" ? "active" : ""}
          onClick={() => setSeccionActiva("sesiones")}
        >
          Sesiones activas
        </button>

        <button
          className={seccionActiva === "historial" ? "active" : ""}
          onClick={() => setSeccionActiva("historial")}
        >
          Historial
        </button>

        <button
          className={seccionActiva === "mantenimiento" ? "active" : ""}
          onClick={() => setSeccionActiva("mantenimiento")}
        >
          Mantenimiento
        </button>

      </nav>

      {seccionActiva === "activos" && (
        <>
          <section className="juegos-kpis">

            <button
              className={`juego-kpi ${
                filtroEstado === "todos" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("todos")}
            >
              <span>Total juegos</span>
              <strong>{juegos.length}</strong>
              <small>Registrados</small>
            </button>

            <button
              className={`juego-kpi ${
                filtroEstado === "disponible" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("disponible")}
            >
              <span>Disponibles</span>
              <strong>
                {juegos.filter((j) => j.estado === "disponible").length}
              </strong>
              <small>Listos para iniciar</small>
            </button>

            <button
              className={`juego-kpi ${
                filtroEstado === "ocupado" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("ocupado")}
            >
              <span>Ocupados</span>
              <strong>
                {juegos.filter((j) => j.estado === "ocupado").length}
              </strong>
              <small>Con sesión activa</small>
            </button>

            <button
              className={`juego-kpi warning ${
                filtroEstado === "mantenimiento" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("mantenimiento")}
            >
              <span>Mantenimiento</span>
              <strong>
                {
                  juegos.filter(
                    (j) => j.estado === "mantenimiento"
                  ).length
                }
              </strong>
              <small>Fuera de servicio</small>
            </button>

          </section>

          <section className="juegos-toolbar">

            <div className="juegos-filters">

              {["todos", "disponible", "ocupado", "mantenimiento"].map(
                (estado) => (
                  <button
                    key={estado}
                    className={`filter-button ${
                      filtroEstado === estado ? "active" : ""
                    }`}
                    onClick={() => setFiltroEstado(estado)}
                  >
                    {estado === "todos"
                      ? "Todos"
                      : nombreEstado(estado)}
                  </button>
                )
              )}

            </div>

            <div className="juegos-search">
              <input
                type="text"
                placeholder="Buscar juego..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </div>

          </section>

          <section className="juegos-grid">

            {juegosFiltrados.map((juego) => (
              <article
                key={juego.id}
                className="juego-card"
              >

                <div className="juego-card-header">

                  <div className="juego-icon">
                    {juego.tipo === "Billar" && "🎱"}
                    {juego.tipo === "Tejo" && "🎯"}
                    {juego.tipo === "Bolirana" && "◎"}
                  </div>

                  <span className={`juego-status ${juego.estado}`}>
                    {nombreEstado(juego.estado)}
                  </span>

                </div>

                <div className="juego-card-body">

                  <span className="juego-code">
                    {juego.codigo}
                  </span>

                  <h3>{juego.nombre}</h3>

                  <p>{juego.tipo}</p>

                  <div className="juego-info-grid">

                    <div>
                      <span>Precio / hora</span>
                      <strong>
                        {formatearDinero(juego.precioHora)}
                      </strong>
                    </div>

                    <div>
                      <span>Mesa</span>
                      <strong>
                        {juego.mesa || "Sin asignar"}
                      </strong>
                    </div>

                  </div>

                </div>

                <button
                  className="juego-detail-button"
                  onClick={() => setJuegoSeleccionado(juego)}
                >
                  Ver detalle
                </button>

              </article>
            ))}

          </section>
        </>
      )}

  {seccionActiva === "sesiones" && (
  <SesionesJuegosSection />
)}

{seccionActiva === "historial" && (
  <HistorialJuegosSection />
)}

{seccionActiva === "mantenimiento" && (
  <MantenimientoJuegosSection />
)}

      {juegoSeleccionado && (
        <>
          <div
            className="juego-overlay"
            onClick={() => setJuegoSeleccionado(null)}
          ></div>

          <aside className="juego-drawer">

            <div className="juego-drawer-header">

              <div>
                <p className="page-eyebrow">
                  DETALLE DEL JUEGO
                </p>

                <h2>
                  {juegoSeleccionado.nombre}
                </h2>

                <span>
                  {juegoSeleccionado.codigo}
                </span>
              </div>

              <button
                className="drawer-close"
                onClick={() => setJuegoSeleccionado(null)}
              >
                ×
              </button>

            </div>

            <div className="juego-drawer-status">
              <span>Estado actual</span>

              <strong>
                {nombreEstado(juegoSeleccionado.estado)}
              </strong>
            </div>

            <div className="juego-detail-grid">

              <div>
                <span>Tipo</span>
                <strong>{juegoSeleccionado.tipo}</strong>
              </div>

              <div>
                <span>Precio por hora</span>
                <strong>
                  {formatearDinero(
                    juegoSeleccionado.precioHora
                  )}
                </strong>
              </div>

              <div>
                <span>Mesa asociada</span>
                <strong>
                  {juegoSeleccionado.mesa || "Sin asignar"}
                </strong>
              </div>

              <div>
                <span>Identificador</span>
                <strong>{juegoSeleccionado.codigo}</strong>
              </div>

            </div>

            {juegoSeleccionado.estado === "disponible" && (
              <button className="drawer-primary-button">
                Iniciar sesión
              </button>
            )}

            {juegoSeleccionado.estado === "ocupado" && (
              <div className="juego-drawer-actions">

                <button className="drawer-primary-button">
                  Ver sesión activa
                </button>

                <button className="drawer-secondary-button">
                  Finalizar sesión
                </button>

              </div>
            )}

            {juegoSeleccionado.estado === "mantenimiento" && (
              <div className="juego-maintenance-notice">
                Este juego no puede iniciar sesiones mientras se encuentre
                en mantenimiento.
              </div>
            )}

          </aside>
        </>
      )}

    </div>
  );
}

export default JuegosPage;