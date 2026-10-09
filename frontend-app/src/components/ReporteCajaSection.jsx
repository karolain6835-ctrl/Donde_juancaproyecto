import { useMemo, useState } from "react";

import {
  WalletCards,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeDollarSign,
  TriangleAlert,
  CalendarRange,
  BarChart3,
  CircleCheck,
  UserRound,
  ArrowRight,
  X,
  LockKeyhole,
  Calculator,
} from "lucide-react";

import "./ReporteCajaSection.css";

function ReporteCajaSection() {
  const [periodo, setPeriodo] = useState("semana");
  const [cierreSeleccionado, setCierreSeleccionado] = useState(null);

  const cierres = [
    {
      id: "CJ-041",
      fecha: "01/10/2026",
      responsable: "Karol",
      ingresos: 2210000,
      salidas: 160000,
      balance: 2050000,
      diferencia: 0,
      estado: "cuadrado",
    },
    {
      id: "CJ-040",
      fecha: "30/09/2026",
      responsable: "Carlos",
      ingresos: 1980000,
      salidas: 210000,
      balance: 1770000,
      diferencia: -15000,
      estado: "diferencia",
    },
    {
      id: "CJ-039",
      fecha: "29/09/2026",
      responsable: "Daniela",
      ingresos: 1740000,
      salidas: 120000,
      balance: 1620000,
      diferencia: 5000,
      estado: "diferencia",
    },
    {
      id: "CJ-038",
      fecha: "28/09/2026",
      responsable: "Karol",
      ingresos: 2360000,
      salidas: 180000,
      balance: 2180000,
      diferencia: 0,
      estado: "cuadrado",
    },
  ];

  const movimientoDiario = [
    {
      fecha: "28 Sep",
      ingresos: 2360000,
      salidas: 180000,
    },
    {
      fecha: "29 Sep",
      ingresos: 1740000,
      salidas: 120000,
    },
    {
      fecha: "30 Sep",
      ingresos: 1980000,
      salidas: 210000,
    },
    {
      fecha: "01 Oct",
      ingresos: 2210000,
      salidas: 160000,
    },
  ];

  const totalIngresos = useMemo(() => {
    return cierres.reduce(
      (total, cierre) => total + cierre.ingresos,
      0
    );
  }, [cierres]);

  const totalSalidas = useMemo(() => {
    return cierres.reduce(
      (total, cierre) => total + cierre.salidas,
      0
    );
  }, [cierres]);

  const balanceTotal = totalIngresos - totalSalidas;

  const diferenciaTotal = cierres.reduce(
    (total, cierre) => total + cierre.diferencia,
    0
  );

  const maxMovimiento = Math.max(
    ...movimientoDiario.flatMap((registro) => [
      registro.ingresos,
      registro.salidas,
    ])
  );

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function nombreEstado(estado) {
    if (estado === "cuadrado") return "Cuadrado";
    if (estado === "diferencia") return "Con diferencia";

    return estado;
  }

  return (
    <div className="reporte-caja-section">

      <section className="reporte-caja-toolbar">

        <div>
          <h2>
            Comportamiento de caja
          </h2>

          <p>
            Analiza ingresos, salidas, balances y diferencias de los cierres.
          </p>
        </div>

        <div className="reporte-caja-periodo">

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
            <option value="hoy">
              Hoy
            </option>

            <option value="semana">
              Esta semana
            </option>

            <option value="mes">
              Este mes
            </option>

            <option value="personalizado">
              Personalizado
            </option>
          </select>

        </div>

      </section>

      <section className="reporte-caja-kpis">

        <article className="reporte-caja-kpi">

          <div className="reporte-caja-kpi-icon income">
            <ArrowDownToLine
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Ingresos
          </span>

          <strong>
            {formatearDinero(totalIngresos)}
          </strong>

          <small>
            Ingresos registrados
          </small>

        </article>

        <article className="reporte-caja-kpi">

          <div className="reporte-caja-kpi-icon output">
            <ArrowUpFromLine
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Salidas
          </span>

          <strong>
            {formatearDinero(totalSalidas)}
          </strong>

          <small>
            Gastos y retiros
          </small>

        </article>

        <article className="reporte-caja-kpi">

          <div className="reporte-caja-kpi-icon balance">
            <BadgeDollarSign
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Balance
          </span>

          <strong>
            {formatearDinero(balanceTotal)}
          </strong>

          <small>
            Ingresos menos salidas
          </small>

        </article>

        <article className="reporte-caja-kpi">

          <div
            className={`reporte-caja-kpi-icon difference ${
              diferenciaTotal === 0 ? "ok" : "alert"
            }`}
          >
            {diferenciaTotal === 0 ? (
              <CircleCheck
                size={20}
                strokeWidth={1.9}
              />
            ) : (
              <TriangleAlert
                size={20}
                strokeWidth={1.9}
              />
            )}
          </div>

          <span>
            Diferencias
          </span>

          <strong>
            {formatearDinero(diferenciaTotal)}
          </strong>

          <small>
            {diferenciaTotal === 0
              ? "Sin diferencias acumuladas"
              : "Requiere revisión"}
          </small>

        </article>

      </section>

      <section className="reporte-caja-main-grid">

        <article className="reporte-caja-panel">

          <div className="reporte-caja-panel-header">

            <div className="reporte-caja-panel-title">

              <div className="reporte-caja-panel-icon">
                <BarChart3
                  size={18}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h3>
                  Ingresos vs. salidas
                </h3>

                <p>
                  Comparación diaria de movimientos de caja
                </p>
              </div>

            </div>

          </div>

          <div className="reporte-caja-chart">

            {movimientoDiario.map((registro) => {
              const alturaIngresos =
                (registro.ingresos / maxMovimiento) * 100;

              const alturaSalidas =
                (registro.salidas / maxMovimiento) * 100;

              return (
                <div
                  key={registro.fecha}
                  className="reporte-caja-chart-group"
                >

                  <div className="reporte-caja-bars">

                    <div
                      className="reporte-caja-bar ingreso"
                      style={{
                        height: `${Math.max(
                          alturaIngresos,
                          8
                        )}%`,
                      }}
                      title={`Ingresos ${formatearDinero(
                        registro.ingresos
                      )}`}
                    ></div>

                    <div
                      className="reporte-caja-bar salida"
                      style={{
                        height: `${Math.max(
                          alturaSalidas,
                          8
                        )}%`,
                      }}
                      title={`Salidas ${formatearDinero(
                        registro.salidas
                      )}`}
                    ></div>

                  </div>

                  <span>
                    {registro.fecha}
                  </span>

                </div>
              );
            })}

          </div>

          <div className="reporte-caja-legend">

            <span>
              <i className="legend-income"></i>
              Ingresos
            </span>

            <span>
              <i className="legend-output"></i>
              Salidas
            </span>

          </div>

        </article>

        <article className="reporte-caja-panel">

          <div className="reporte-caja-panel-header">

            <div className="reporte-caja-panel-title">

              <div className="reporte-caja-panel-icon">
                <WalletCards
                  size={18}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h3>
                  Estado de cierres
                </h3>

                <p>
                  Resultado de los cierres incluidos
                </p>
              </div>

            </div>

          </div>

          <div className="reporte-caja-status-list">

            <div className="reporte-caja-status-row">

              <div className="reporte-caja-status-info">

                <span className="reporte-caja-status-icon ok">
                  <CircleCheck
                    size={16}
                    strokeWidth={1.9}
                  />
                </span>

                <div>
                  <strong>
                    Cuadrados
                  </strong>

                  <span>
                    Sin diferencia registrada
                  </span>
                </div>

              </div>

              <strong>
                {
                  cierres.filter(
                    (cierre) =>
                      cierre.estado === "cuadrado"
                  ).length
                }
              </strong>

            </div>

            <div className="reporte-caja-status-row">

              <div className="reporte-caja-status-info">

                <span className="reporte-caja-status-icon alert">
                  <TriangleAlert
                    size={16}
                    strokeWidth={1.9}
                  />
                </span>

                <div>
                  <strong>
                    Con diferencia
                  </strong>

                  <span>
                    Requieren revisión
                  </span>
                </div>

              </div>

              <strong>
                {
                  cierres.filter(
                    (cierre) =>
                      cierre.estado === "diferencia"
                  ).length
                }
              </strong>

            </div>

            <div className="reporte-caja-summary-box">

              <span>
                Resultado del período
              </span>

              <strong>
                {cierres.some(
                  (cierre) =>
                    cierre.estado === "diferencia"
                )
                  ? "Con incidencias"
                  : "Periodo estable"}
              </strong>

            </div>

          </div>

        </article>

      </section>

      <section className="reporte-caja-panel">

        <div className="reporte-caja-panel-header">

          <div className="reporte-caja-panel-title">

            <div className="reporte-caja-panel-icon">
              <Calculator
                size={18}
                strokeWidth={1.9}
              />
            </div>

            <div>
              <h3>
                Cierres recientes
              </h3>

              <p>
                Detalle de resultados de caja
              </p>
            </div>

          </div>

          <span className="reporte-caja-readonly-badge">
            <LockKeyhole
              size={13}
              strokeWidth={1.9}
            />

            Solo consulta
          </span>

        </div>

        <div className="reporte-caja-table-wrapper">

          <table className="reporte-caja-table">

            <thead>
              <tr>
                <th>Cierre</th>
                <th>Fecha</th>
                <th>Responsable</th>
                <th>Ingresos</th>
                <th>Salidas</th>
                <th>Balance</th>
                <th>Diferencia</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {cierres.map((cierre) => (

                <tr key={cierre.id}>

                  <td>
                    <span className="reporte-caja-code">
                      {cierre.id}
                    </span>
                  </td>

                  <td>
                    {cierre.fecha}
                  </td>

                  <td>
                    {cierre.responsable}
                  </td>

                  <td>
                    {formatearDinero(
                      cierre.ingresos
                    )}
                  </td>

                  <td>
                    {formatearDinero(
                      cierre.salidas
                    )}
                  </td>

                  <td>
                    <strong>
                      {formatearDinero(
                        cierre.balance
                      )}
                    </strong>
                  </td>

                  <td>
                    <span
                      className={
                        cierre.diferencia === 0
                          ? "reporte-caja-diff-ok"
                          : "reporte-caja-diff-alert"
                      }
                    >
                      {formatearDinero(
                        cierre.diferencia
                      )}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`reporte-caja-status ${cierre.estado}`}
                    >
                      {cierre.estado === "cuadrado" ? (
                        <CircleCheck
                          size={13}
                          strokeWidth={1.9}
                        />
                      ) : (
                        <TriangleAlert
                          size={13}
                          strokeWidth={1.9}
                        />
                      )}

                      {nombreEstado(
                        cierre.estado
                      )}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="reporte-caja-detail-button"
                      onClick={() =>
                        setCierreSeleccionado(cierre)
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

      {cierreSeleccionado && (
        <>

          <div
            className="reporte-caja-overlay"
            onClick={() =>
              setCierreSeleccionado(null)
            }
          ></div>

          <aside className="reporte-caja-drawer">

            <div className="reporte-caja-drawer-header">

              <div>
                <p className="page-eyebrow">
                  REPORTE DE CAJA
                </p>

                <h2>
                  {cierreSeleccionado.id}
                </h2>

                <span>
                  {cierreSeleccionado.fecha}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setCierreSeleccionado(null)
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
              className={`reporte-caja-state-box ${cierreSeleccionado.estado}`}
            >

              <span>
                Estado del cierre
              </span>

              <strong>
                {cierreSeleccionado.estado === "cuadrado" ? (
                  <CircleCheck
                    size={17}
                    strokeWidth={1.9}
                  />
                ) : (
                  <TriangleAlert
                    size={17}
                    strokeWidth={1.9}
                  />
                )}

                {nombreEstado(
                  cierreSeleccionado.estado
                )}
              </strong>

            </div>

            <div className="reporte-caja-detail-grid">

              <div>
                <span>
                  Responsable
                </span>

                <strong>
                  <UserRound
                    size={14}
                    strokeWidth={1.9}
                  />

                  {cierreSeleccionado.responsable}
                </strong>
              </div>

              <div>
                <span>
                  Ingresos
                </span>

                <strong className="reporte-caja-income-value">
                  <ArrowDownToLine
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(
                    cierreSeleccionado.ingresos
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Salidas
                </span>

                <strong className="reporte-caja-output-value">
                  <ArrowUpFromLine
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(
                    cierreSeleccionado.salidas
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Balance
                </span>

                <strong>
                  <BadgeDollarSign
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(
                    cierreSeleccionado.balance
                  )}
                </strong>
              </div>

            </div>

            <div
              className={`reporte-caja-difference-box ${
                cierreSeleccionado.diferencia === 0
                  ? "ok"
                  : "alert"
              }`}
            >

              <span>
                Diferencia registrada
              </span>

              <strong>
                {formatearDinero(
                  cierreSeleccionado.diferencia
                )}
              </strong>

            </div>

            <div className="reporte-caja-readonly">

              <LockKeyhole
                size={17}
                strokeWidth={1.9}
              />

              <span>
                Este reporte es de consulta. La gestión y confirmación de cierres se realiza desde Caja y pagos.
              </span>

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

export default ReporteCajaSection;