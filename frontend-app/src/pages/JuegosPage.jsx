import { useMemo, useState } from "react";

import {
  Search,
  Gamepad2,
  CircleCheck,
  Clock3,
  Wrench,
  CircleDot,
  Target,
  Trophy,
  BadgeDollarSign,
  Armchair,
  ArrowRight,
  X,
  Tags,
  Play,
  Eye,
  Square,
  History,
} from "lucide-react";

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

  function iconoJuego(tipo) {
    if (tipo === "Billar") {
      return <CircleDot size={21} strokeWidth={1.9} />;
    }

    if (tipo === "Tejo") {
      return <Target size={21} strokeWidth={1.9} />;
    }

    return <Trophy size={21} strokeWidth={1.9} />;
  }

  return (
    <div className="juegos-page">

      <header className="juegos-header">
        <div>
          <p className="page-eyebrow">
            JUEGOS
          </p>

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
          type="button"
          className={seccionActiva === "activos" ? "active" : ""}
          onClick={() => setSeccionActiva("activos")}
        >
          <Gamepad2 size={16} strokeWidth={1.9} />
          Activos
        </button>

        <button
          type="button"
          className={seccionActiva === "sesiones" ? "active" : ""}
          onClick={() => setSeccionActiva("sesiones")}
        >
          <Play size={16} strokeWidth={1.9} />
          Sesiones activas
        </button>

        <button
          type="button"
          className={seccionActiva === "historial" ? "active" : ""}
          onClick={() => setSeccionActiva("historial")}
        >
          <History size={16} strokeWidth={1.9} />
          Historial
        </button>

        <button
          type="button"
          className={seccionActiva === "mantenimiento" ? "active" : ""}
          onClick={() => setSeccionActiva("mantenimiento")}
        >
          <Wrench size={16} strokeWidth={1.9} />
          Mantenimiento
        </button>

      </nav>

      {seccionActiva === "activos" && (
        <>

          <section className="juegos-kpis">

            <button
              type="button"
              className={`juego-kpi ${
                filtroEstado === "todos" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("todos")}
            >
              <div className="juego-kpi-icon total">
                <Gamepad2 size={20} strokeWidth={1.9} />
              </div>

              <span>Total juegos</span>

              <strong>
                {juegos.length}
              </strong>

              <small>
                Registrados
              </small>
            </button>

            <button
              type="button"
              className={`juego-kpi ${
                filtroEstado === "disponible" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("disponible")}
            >
              <div className="juego-kpi-icon available">
                <CircleCheck size={20} strokeWidth={1.9} />
              </div>

              <span>
                Disponibles
              </span>

              <strong>
                {juegos.filter(
                  (juego) => juego.estado === "disponible"
                ).length}
              </strong>

              <small>
                Listos para iniciar
              </small>
            </button>

            <button
              type="button"
              className={`juego-kpi ${
                filtroEstado === "ocupado" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("ocupado")}
            >
              <div className="juego-kpi-icon occupied">
                <Clock3 size={20} strokeWidth={1.9} />
              </div>

              <span>
                Ocupados
              </span>

              <strong>
                {juegos.filter(
                  (juego) => juego.estado === "ocupado"
                ).length}
              </strong>

              <small>
                Con sesión activa
              </small>
            </button>

            <button
              type="button"
              className={`juego-kpi warning ${
                filtroEstado === "mantenimiento" ? "selected" : ""
              }`}
              onClick={() => setFiltroEstado("mantenimiento")}
            >
              <div className="juego-kpi-icon maintenance">
                <Wrench size={20} strokeWidth={1.9} />
              </div>

              <span>
                Mantenimiento
              </span>

              <strong>
                {juegos.filter(
                  (juego) => juego.estado === "mantenimiento"
                ).length}
              </strong>

              <small>
                Fuera de servicio
              </small>
            </button>

          </section>

          <section className="juegos-toolbar">

            <div className="juegos-filters">

              {[
                "todos",
                "disponible",
                "ocupado",
                "mantenimiento",
              ].map((estado) => (
                <button
                  key={estado}
                  type="button"
                  className={`filter-button ${
                    filtroEstado === estado
                      ? "active"
                      : ""
                  }`}
                  onClick={() => setFiltroEstado(estado)}
                >
                  {estado === "todos"
                    ? "Todos"
                    : nombreEstado(estado)}
                </button>
              ))}

            </div>

            <div className="juegos-search">

              <Search
                className="juegos-search-icon"
                size={18}
                strokeWidth={1.9}
              />

              <input
                type="text"
                placeholder="Buscar juego..."
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
              />

            </div>

          </section>

          <section className="juegos-grid">

            {juegosFiltrados.map((juego) => (

              <article
                key={juego.id}
                className={`juego-card ${juego.estado}`}
              >

                <div className="juego-card-header">

                  <div
                    className={`juego-icon ${juego.tipo.toLowerCase()}`}
                  >
                    {iconoJuego(juego.tipo)}
                  </div>

                  <span
                    className={`juego-status ${juego.estado}`}
                  >
                    {nombreEstado(juego.estado)}
                  </span>

                </div>

                <div className="juego-card-body">

                  <span className="juego-code">
                    <Tags size={12} strokeWidth={1.9} />
                    {juego.codigo}
                  </span>

                  <h3>
                    {juego.nombre}
                  </h3>

                  <p>
                    {juego.tipo}
                  </p>

                  <div className="juego-info-grid">

                    <div>
                      <span>
                        Precio / hora
                      </span>

                      <strong>
                        <BadgeDollarSign
                          size={14}
                          strokeWidth={1.9}
                        />

                        {formatearDinero(juego.precioHora)}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Mesa
                      </span>

                      <strong>
                        <Armchair
                          size={14}
                          strokeWidth={1.9}
                        />

                        {juego.mesa || "Sin asignar"}
                      </strong>
                    </div>

                  </div>

                </div>

                <button
                  type="button"
                  className="juego-detail-button"
                  onClick={() => setJuegoSeleccionado(juego)}
                >
                  Ver detalle

                  <ArrowRight
                    size={15}
                    strokeWidth={1.9}
                  />
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
                type="button"
                className="drawer-close"
                onClick={() =>
                  setJuegoSeleccionado(null)
                }
                aria-label="Cerrar detalle"
              >
                <X size={20} strokeWidth={1.9} />
              </button>

            </div>

            <div
              className={`juego-drawer-status ${juegoSeleccionado.estado}`}
            >
              <span>
                Estado actual
              </span>

              <strong>
                {nombreEstado(
                  juegoSeleccionado.estado
                )}
              </strong>
            </div>

            <div className="juego-detail-grid">

              <div>
                <span>
                  Tipo
                </span>

                <strong>
                  {iconoJuego(juegoSeleccionado.tipo)}

                  {juegoSeleccionado.tipo}
                </strong>
              </div>

              <div>
                <span>
                  Precio por hora
                </span>

                <strong>
                  <BadgeDollarSign
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(
                    juegoSeleccionado.precioHora
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Mesa asociada
                </span>

                <strong>
                  <Armchair
                    size={14}
                    strokeWidth={1.9}
                  />

                  {juegoSeleccionado.mesa || "Sin asignar"}
                </strong>
              </div>

              <div>
                <span>
                  Identificador
                </span>

                <strong>
                  <Tags
                    size={14}
                    strokeWidth={1.9}
                  />

                  {juegoSeleccionado.codigo}
                </strong>
              </div>

            </div>

            {juegoSeleccionado.estado === "disponible" && (
              <button
                type="button"
                className="drawer-primary-button"
              >
                <Play
                  size={17}
                  strokeWidth={1.9}
                />

                Iniciar sesión
              </button>
            )}

            {juegoSeleccionado.estado === "ocupado" && (
              <div className="juego-drawer-actions">

                <button
                  type="button"
                  className="drawer-primary-button"
                >
                  <Eye
                    size={17}
                    strokeWidth={1.9}
                  />

                  Ver sesión activa
                </button>

                <button
                  type="button"
                  className="drawer-secondary-button"
                >
                  <Square
                    size={17}
                    strokeWidth={1.9}
                  />

                  Finalizar sesión
                </button>

              </div>
            )}

            {juegoSeleccionado.estado === "mantenimiento" && (
              <div className="juego-maintenance-notice">

                <Wrench
                  size={18}
                  strokeWidth={1.9}
                />

                <span>
                  Este juego no puede iniciar sesiones mientras se encuentre en mantenimiento.
                </span>

              </div>
            )}

          </aside>

        </>
      )}

    </div>
  );
}

export default JuegosPage;