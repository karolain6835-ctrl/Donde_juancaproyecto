import { useMemo, useState } from "react";

import {
  Search,
  Play,
  CircleDot,
  Target,
  BadgeDollarSign,
  Clock3,
  UserRound,
  Armchair,
  ArrowRight,
  X,
  CircleCheck,
  ReceiptText,
  Timer,
  Square,
  RotateCcw,
} from "lucide-react";

import "./SesionesJuegosSection.css";

function SesionesJuegosSection() {
  const [busqueda, setBusqueda] = useState("");
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null);
  const [confirmacionFinalizar, setConfirmacionFinalizar] = useState(false);

  const [sesiones, setSesiones] = useState([
    {
      id: 1,
      codigo: "SES-001",
      juego: "Billar 1",
      tipo: "Billar",
      mesa: "Mesa 4",
      inicio: "15:10",
      duracion: "1 h 24 min",
      responsable: "Carlos",
      precioHora: 18000,
      costo: 25200,
      consumo: 46000,
    },
    {
      id: 2,
      codigo: "SES-002",
      juego: "Tejo 2",
      tipo: "Tejo",
      mesa: "Mesa 8",
      inicio: "15:45",
      duracion: "49 min",
      responsable: "Daniela",
      precioHora: 15000,
      costo: 12250,
      consumo: 38000,
    },
    {
      id: 3,
      codigo: "SES-003",
      juego: "Billar 2",
      tipo: "Billar",
      mesa: "Mesa 2",
      inicio: "16:02",
      duracion: "32 min",
      responsable: "Laura",
      precioHora: 18000,
      costo: 9600,
      consumo: 24000,
    },
  ]);

  const sesionesFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return sesiones.filter(
      (sesion) =>
        sesion.codigo.toLowerCase().includes(texto) ||
        sesion.juego.toLowerCase().includes(texto) ||
        sesion.mesa.toLowerCase().includes(texto) ||
        sesion.responsable.toLowerCase().includes(texto)
    );
  }, [sesiones, busqueda]);

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function abrirDetalle(sesion) {
    setSesionSeleccionada(sesion);
    setConfirmacionFinalizar(false);
  }

  function cerrarDetalle() {
    setSesionSeleccionada(null);
    setConfirmacionFinalizar(false);
  }

  function solicitarFinalizacion() {
    setConfirmacionFinalizar(true);
  }

  function cancelarFinalizacion() {
    setConfirmacionFinalizar(false);
  }

  function finalizarSesion() {
    if (!sesionSeleccionada) return;

    setSesiones((actuales) =>
      actuales.filter(
        (sesion) => sesion.id !== sesionSeleccionada.id
      )
    );

    cerrarDetalle();
  }

  function iconoTipo(tipo) {
    if (tipo === "Billar") {
      return <CircleDot size={18} strokeWidth={1.9} />;
    }

    return <Target size={18} strokeWidth={1.9} />;
  }

  return (
    <div className="sesiones-juegos-section">

      <section className="sesiones-juegos-toolbar">

        <div>
          <h2>
            Sesiones en curso
          </h2>

          <p>
            Consulta el uso actual de los juegos y su costo acumulado.
          </p>
        </div>

        <div className="sesiones-juegos-search">

          <Search
            className="sesiones-juegos-search-icon"
            size={18}
            strokeWidth={1.9}
          />

          <input
            type="text"
            placeholder="Buscar sesión, juego o mesa..."
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
          />

        </div>

      </section>

      <section className="sesiones-juegos-kpis">

        <article className="sesion-juego-kpi">

          <div className="sesion-juego-kpi-icon active">
            <Play size={20} strokeWidth={1.9} />
          </div>

          <span>
            Sesiones activas
          </span>

          <strong>
            {sesiones.length}
          </strong>

          <small>
            En curso actualmente
          </small>

        </article>

        <article className="sesion-juego-kpi">

          <div className="sesion-juego-kpi-icon billar">
            <CircleDot size={20} strokeWidth={1.9} />
          </div>

          <span>
            Billar
          </span>

          <strong>
            {
              sesiones.filter(
                (sesion) => sesion.tipo === "Billar"
              ).length
            }
          </strong>

          <small>
            Sesiones activas
          </small>

        </article>

        <article className="sesion-juego-kpi">

          <div className="sesion-juego-kpi-icon tejo">
            <Target size={20} strokeWidth={1.9} />
          </div>

          <span>
            Tejo
          </span>

          <strong>
            {
              sesiones.filter(
                (sesion) => sesion.tipo === "Tejo"
              ).length
            }
          </strong>

          <small>
            Sesiones activas
          </small>

        </article>

        <article className="sesion-juego-kpi">

          <div className="sesion-juego-kpi-icon money">
            <BadgeDollarSign size={20} strokeWidth={1.9} />
          </div>

          <span>
            Costo acumulado
          </span>

          <strong>
            {formatearDinero(
              sesiones.reduce(
                (total, sesion) => total + sesion.costo,
                0
              )
            )}
          </strong>

          <small>
            Solo juegos
          </small>

        </article>

      </section>

      <section className="sesiones-juegos-panel">

        <div className="sesiones-juegos-panel-header">

          <div>
            <h2>
              Sesiones activas
            </h2>

            <p>
              {sesionesFiltradas.length} sesiones encontradas
            </p>
          </div>

        </div>

        <div className="sesiones-juegos-grid">

          {sesionesFiltradas.map((sesion) => (

            <article
              key={sesion.id}
              className="sesion-juego-card"
            >

              <div className="sesion-juego-card-header">

                <div>

                  <span className="sesion-juego-code">
                    {sesion.codigo}
                  </span>

                  <div className="sesion-juego-title-row">

                    <span className={`sesion-juego-type-icon ${sesion.tipo.toLowerCase()}`}>
                      {iconoTipo(sesion.tipo)}
                    </span>

                    <h3>
                      {sesion.juego}
                    </h3>

                  </div>

                  <p>
                    <Armchair
                      size={13}
                      strokeWidth={1.9}
                    />

                    {sesion.mesa}
                  </p>

                </div>

                <span className="sesion-juego-status">
                  Activa
                </span>

              </div>

              <div className="sesion-juego-info">

                <div>
                  <span>
                    Inicio
                  </span>

                  <strong>
                    <Clock3
                      size={14}
                      strokeWidth={1.9}
                    />

                    {sesion.inicio}
                  </strong>
                </div>

                <div>
                  <span>
                    Duración
                  </span>

                  <strong>
                    <Timer
                      size={14}
                      strokeWidth={1.9}
                    />

                    {sesion.duracion}
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

                    {sesion.responsable}
                  </strong>
                </div>

                <div>
                  <span>
                    Costo juego
                  </span>

                  <strong>
                    <BadgeDollarSign
                      size={14}
                      strokeWidth={1.9}
                    />

                    {formatearDinero(sesion.costo)}
                  </strong>
                </div>

              </div>

              <button
                type="button"
                className="sesion-juego-detail-button"
                onClick={() => abrirDetalle(sesion)}
              >
                Ver detalle

                <ArrowRight
                  size={15}
                  strokeWidth={1.9}
                />
              </button>

            </article>

          ))}

        </div>

      </section>

      {sesionSeleccionada && (
        <>

          <div
            className="sesion-juego-overlay"
            onClick={cerrarDetalle}
          ></div>

          <aside className="sesion-juego-drawer">

            <div className="sesion-juego-drawer-header">

              <div>
                <p className="page-eyebrow">
                  SESIÓN ACTIVA
                </p>

                <h2>
                  {sesionSeleccionada.juego}
                </h2>

                <span>
                  {sesionSeleccionada.codigo}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={cerrarDetalle}
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div className="sesion-juego-drawer-status">

              <span>
                Estado
              </span>

              <strong>
                <CircleCheck
                  size={17}
                  strokeWidth={1.9}
                />

                Activa
              </strong>

            </div>

            <div className="sesion-juego-detail-grid">

              <div>
                <span>
                  Mesa
                </span>

                <strong>
                  <Armchair
                    size={14}
                    strokeWidth={1.9}
                  />

                  {sesionSeleccionada.mesa}
                </strong>
              </div>

              <div>
                <span>
                  Hora de inicio
                </span>

                <strong>
                  <Clock3
                    size={14}
                    strokeWidth={1.9}
                  />

                  {sesionSeleccionada.inicio}
                </strong>
              </div>

              <div>
                <span>
                  Duración
                </span>

                <strong>
                  <Timer
                    size={14}
                    strokeWidth={1.9}
                  />

                  {sesionSeleccionada.duracion}
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

                  {sesionSeleccionada.responsable}
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
                    sesionSeleccionada.precioHora
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Costo acumulado
                </span>

                <strong>
                  <BadgeDollarSign
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(
                    sesionSeleccionada.costo
                  )}
                </strong>
              </div>

            </div>

            <div className="sesion-juego-account">

              <div className="sesion-juego-account-title">

                <div>
                  <ReceiptText
                    size={18}
                    strokeWidth={1.9}
                  />

                  <span>
                    Cuenta actual
                  </span>
                </div>

              </div>

              <div>
                <span>
                  Consumo asociado
                </span>

                <strong>
                  {formatearDinero(
                    sesionSeleccionada.consumo
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Juego
                </span>

                <strong>
                  {formatearDinero(
                    sesionSeleccionada.costo
                  )}
                </strong>
              </div>

              <div className="sesion-juego-account-total">

                <span>
                  Total actual
                </span>

                <strong>
                  {formatearDinero(
                    sesionSeleccionada.consumo +
                      sesionSeleccionada.costo
                  )}
                </strong>

              </div>

            </div>

            {!confirmacionFinalizar && (

              <button
                type="button"
                className="drawer-primary-button sesion-finalizar-main"
                onClick={solicitarFinalizacion}
              >
                <Square
                  size={17}
                  strokeWidth={1.9}
                />

                Finalizar sesión
              </button>

            )}

            {confirmacionFinalizar && (

              <div className="sesion-finalizar-box">

                <div className="sesion-finalizar-heading">

                  <Square
                    size={18}
                    strokeWidth={1.9}
                  />

                  <h3>
                    Finalizar sesión
                  </h3>

                </div>

                <p>
                  La sesión de {sesionSeleccionada.juego} será cerrada y pasará al historial.
                </p>

                <div className="sesion-finalizar-summary">

                  <div>
                    <span>
                      Duración
                    </span>

                    <strong>
                      {sesionSeleccionada.duracion}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Mesa
                    </span>

                    <strong>
                      {sesionSeleccionada.mesa}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Costo juego
                    </span>

                    <strong>
                      {formatearDinero(
                        sesionSeleccionada.costo
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Total con consumo
                    </span>

                    <strong>
                      {formatearDinero(
                        sesionSeleccionada.consumo +
                          sesionSeleccionada.costo
                      )}
                    </strong>
                  </div>

                </div>

                <div className="sesion-finalizar-actions">

                  <button
                    type="button"
                    className="drawer-primary-button"
                    onClick={finalizarSesion}
                  >
                    <CircleCheck
                      size={17}
                      strokeWidth={1.9}
                    />

                    Confirmar finalización
                  </button>

                  <button
                    type="button"
                    className="drawer-secondary-button"
                    onClick={cancelarFinalizacion}
                  >
                    <RotateCcw
                      size={17}
                      strokeWidth={1.9}
                    />

                    Cancelar
                  </button>

                </div>

              </div>

            )}

          </aside>

        </>
      )}

    </div>
  );
}

export default SesionesJuegosSection;