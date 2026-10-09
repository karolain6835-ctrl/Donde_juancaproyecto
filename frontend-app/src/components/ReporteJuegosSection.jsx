import { useMemo, useState } from "react";

import {
  Gamepad2,
  Clock3,
  BadgeDollarSign,
  Trophy,
  CalendarRange,
  BarChart3,
  CircleDot,
  Target,
  ArrowRight,
  X,
  LockKeyhole,
  Armchair,
  UserRound,
  Timer,
} from "lucide-react";

import "./ReporteJuegosSection.css";

function ReporteJuegosSection() {
  const [periodo, setPeriodo] = useState("hoy");
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null);

  const sesiones = [
    {
      id: "SES-090",
      juego: "Billar 1",
      tipo: "Billar",
      mesa: "Mesa 4",
      fecha: "02/10/2026",
      duracionMin: 72,
      ingresos: 21600,
      responsable: "Carlos",
    },
    {
      id: "SES-089",
      juego: "Tejo 1",
      tipo: "Tejo",
      mesa: "Mesa 7",
      fecha: "02/10/2026",
      duracionMin: 48,
      ingresos: 12000,
      responsable: "Laura",
    },
    {
      id: "SES-088",
      juego: "Billar 2",
      tipo: "Billar",
      mesa: "Mesa 2",
      fecha: "01/10/2026",
      duracionMin: 125,
      ingresos: 37500,
      responsable: "Daniela",
    },
    {
      id: "SES-087",
      juego: "Bolirana",
      tipo: "Bolirana",
      mesa: "Mesa 9",
      fecha: "01/10/2026",
      duracionMin: 35,
      ingresos: 7000,
      responsable: "Carlos",
    },
    {
      id: "SES-086",
      juego: "Tejo 2",
      tipo: "Tejo",
      mesa: "Mesa 8",
      fecha: "30/09/2026",
      duracionMin: 96,
      ingresos: 24000,
      responsable: "Laura",
    },
  ];

  const resumenPorTipo = useMemo(() => {
    const resumen = {};

    sesiones.forEach((sesion) => {
      if (!resumen[sesion.tipo]) {
        resumen[sesion.tipo] = {
          sesiones: 0,
          minutos: 0,
          ingresos: 0,
        };
      }

      resumen[sesion.tipo].sesiones += 1;
      resumen[sesion.tipo].minutos += sesion.duracionMin;
      resumen[sesion.tipo].ingresos += sesion.ingresos;
    });

    return resumen;
  }, [sesiones]);

  const totalSesiones = sesiones.length;

  const totalMinutos = sesiones.reduce(
    (total, sesion) => total + sesion.duracionMin,
    0
  );

  const ingresosTotales = sesiones.reduce(
    (total, sesion) => total + sesion.ingresos,
    0
  );

  const duracionPromedio =
    totalSesiones > 0
      ? Math.round(totalMinutos / totalSesiones)
      : 0;

  const juegoMasUsado =
    Object.entries(resumenPorTipo).sort(
      (a, b) => b[1].sesiones - a[1].sesiones
    )[0]?.[0] || "Sin datos";

  const maxSesiones = Math.max(
    ...Object.values(resumenPorTipo).map(
      (registro) => registro.sesiones
    )
  );

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function formatearDuracion(minutos) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;

    if (horas === 0) return `${mins} min`;
    if (mins === 0) return `${horas} h`;

    return `${horas} h ${mins} min`;
  }

  function iconoTipo(tipo) {
    if (tipo === "Billar") {
      return <CircleDot size={15} strokeWidth={1.9} />;
    }

    if (tipo === "Tejo") {
      return <Target size={15} strokeWidth={1.9} />;
    }

    return <Trophy size={15} strokeWidth={1.9} />;
  }

  return (
    <div className="reporte-juegos-section">

      <section className="reporte-juegos-toolbar">

        <div>
          <h2>
            Rendimiento de juegos
          </h2>

          <p>
            Analiza utilización, duración e ingresos generados por los juegos.
          </p>
        </div>

        <div className="reporte-juegos-periodo">

          <CalendarRange
            size={16}
            strokeWidth={1.9}
          />

          <select
            value={periodo}
            onChange={(event) =>
              setPeriodo(event.target.value)
            }
          >
            <option value="hoy">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="personalizado">Personalizado</option>
          </select>

        </div>

      </section>

      <section className="reporte-juegos-kpis">

        <article className="reporte-juego-kpi">

          <div className="reporte-juego-kpi-icon sessions">
            <Gamepad2
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Sesiones realizadas
          </span>

          <strong>
            {totalSesiones}
          </strong>

          <small>
            En el período mostrado
          </small>

        </article>

        <article className="reporte-juego-kpi">

          <div className="reporte-juego-kpi-icon time">
            <Clock3
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Horas de uso
          </span>

          <strong>
            {(totalMinutos / 60).toFixed(1)} h
          </strong>

          <small>
            Uso acumulado
          </small>

        </article>

        <article className="reporte-juego-kpi">

          <div className="reporte-juego-kpi-icon income">
            <BadgeDollarSign
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Ingresos generados
          </span>

          <strong>
            {formatearDinero(ingresosTotales)}
          </strong>

          <small>
            Solo sesiones de juego
          </small>

        </article>

        <article className="reporte-juego-kpi">

          <div className="reporte-juego-kpi-icon leader">
            <Trophy
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Juego más utilizado
          </span>

          <strong>
            {juegoMasUsado}
          </strong>

          <small>
            Duración promedio: {duracionPromedio} min
          </small>

        </article>

      </section>

      <section className="reporte-juegos-main-grid">

        <article className="reporte-juegos-panel">

          <div className="reporte-juegos-panel-header">

            <div className="reporte-juegos-panel-title">

              <div className="reporte-juegos-panel-icon">
                <BarChart3
                  size={18}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h3>
                  Uso por tipo de juego
                </h3>

                <p>
                  Número de sesiones registradas
                </p>
              </div>

            </div>

          </div>

          <div className="juegos-usage-list">

            {Object.entries(resumenPorTipo).map(
              ([tipo, datos]) => {
                const porcentaje =
                  (datos.sesiones / maxSesiones) * 100;

                return (
                  <div
                    key={tipo}
                    className="juego-usage-row"
                  >

                    <div className="juego-usage-info">

                      <div>
                        <strong className="juego-usage-name">
                          {iconoTipo(tipo)}
                          {tipo}
                        </strong>

                        <span>
                          {datos.sesiones} sesiones ·{" "}
                          {formatearDuracion(datos.minutos)}
                        </span>
                      </div>

                      <strong>
                        {datos.sesiones}
                      </strong>

                    </div>

                    <div className="juego-usage-track">

                      <div
                        className="juego-usage-bar"
                        style={{
                          width: `${porcentaje}%`,
                        }}
                      ></div>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </article>

        <article className="reporte-juegos-panel">

          <div className="reporte-juegos-panel-header">

            <div className="reporte-juegos-panel-title">

              <div className="reporte-juegos-panel-icon">
                <BadgeDollarSign
                  size={18}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h3>
                  Ingresos por tipo
                </h3>

                <p>
                  Aporte económico de cada categoría
                </p>
              </div>

            </div>

          </div>

          <div className="juegos-income-list">

            {Object.entries(resumenPorTipo).map(
              ([tipo, datos]) => (

                <div
                  key={tipo}
                  className="juegos-income-row"
                >

                  <div className="juegos-income-info">

                    <span className="juegos-income-icon">
                      {iconoTipo(tipo)}
                    </span>

                    <div>
                      <strong>
                        {tipo}
                      </strong>

                      <span>
                        {datos.sesiones} sesiones
                      </span>
                    </div>

                  </div>

                  <strong>
                    {formatearDinero(
                      datos.ingresos
                    )}
                  </strong>

                </div>

              )
            )}

          </div>

        </article>

      </section>

      <section className="reporte-juegos-panel">

        <div className="reporte-juegos-panel-header">

          <div className="reporte-juegos-panel-title">

            <div className="reporte-juegos-panel-icon">
              <Gamepad2
                size={18}
                strokeWidth={1.9}
              />
            </div>

            <div>
              <h3>
                Sesiones recientes
              </h3>

              <p>
                Historial de uso incluido en el reporte
              </p>
            </div>

          </div>

          <span className="reporte-juegos-readonly-badge">

            <LockKeyhole
              size={13}
              strokeWidth={1.9}
            />

            Solo consulta
          </span>

        </div>

        <div className="reporte-juegos-table-wrapper">

          <table className="reporte-juegos-table">

            <thead>
              <tr>
                <th>Sesión</th>
                <th>Juego</th>
                <th>Tipo</th>
                <th>Mesa</th>
                <th>Fecha</th>
                <th>Duración</th>
                <th>Ingresos</th>
                <th>Responsable</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {sesiones.map((sesion) => (

                <tr key={sesion.id}>

                  <td>
                    <span className="reporte-juego-code">
                      {sesion.id}
                    </span>
                  </td>

                  <td>
                    <strong>
                      {sesion.juego}
                    </strong>
                  </td>

                  <td>
                    <span className="reporte-juego-type">

                      {iconoTipo(
                        sesion.tipo
                      )}

                      {sesion.tipo}

                    </span>
                  </td>

                  <td>
                    {sesion.mesa}
                  </td>

                  <td>
                    {sesion.fecha}
                  </td>

                  <td>
                    {formatearDuracion(
                      sesion.duracionMin
                    )}
                  </td>

                  <td>
                    <strong>
                      {formatearDinero(
                        sesion.ingresos
                      )}
                    </strong>
                  </td>

                  <td>
                    {sesion.responsable}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="reporte-juego-detail-button"
                      onClick={() =>
                        setSesionSeleccionada(sesion)
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

      {sesionSeleccionada && (
        <>

          <div
            className="reporte-juego-overlay"
            onClick={() =>
              setSesionSeleccionada(null)
            }
          ></div>

          <aside className="reporte-juego-drawer">

            <div className="reporte-juego-drawer-header">

              <div>
                <p className="page-eyebrow">
                  SESIÓN DE JUEGO
                </p>

                <h2>
                  {sesionSeleccionada.juego}
                </h2>

                <span>
                  {sesionSeleccionada.id}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setSesionSeleccionada(null)
                }
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div className="reporte-juego-detail-grid">

              <div>
                <span>
                  Tipo
                </span>

                <strong>
                  {iconoTipo(
                    sesionSeleccionada.tipo
                  )}

                  {sesionSeleccionada.tipo}
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

                  {sesionSeleccionada.mesa}
                </strong>
              </div>

              <div>
                <span>
                  Fecha
                </span>

                <strong>
                  <CalendarRange
                    size={14}
                    strokeWidth={1.9}
                  />

                  {sesionSeleccionada.fecha}
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
                  Duración
                </span>

                <strong>
                  <Timer
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDuracion(
                    sesionSeleccionada.duracionMin
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Ingreso generado
                </span>

                <strong>
                  <BadgeDollarSign
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(
                    sesionSeleccionada.ingresos
                  )}
                </strong>
              </div>

            </div>

            <div className="reporte-juego-income-box">

              <div className="reporte-juego-income-icon">
                <BadgeDollarSign
                  size={21}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <span>
                  Ingreso de la sesión
                </span>

                <strong>
                  {formatearDinero(
                    sesionSeleccionada.ingresos
                  )}
                </strong>
              </div>

            </div>

            <div className="reporte-juego-readonly">

              <LockKeyhole
                size={17}
                strokeWidth={1.9}
              />

              <span>
                Este reporte es de consulta. Las sesiones se administran desde el módulo Juegos.
              </span>

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

export default ReporteJuegosSection;