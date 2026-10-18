import {centavosReporte,decimalReporte,porcentajeReporte} from '../services/reportesService';
import ReporteRemote, {ReporteControles,ReportePaginacion} from './ReporteRemote';
import {useReporteReal} from '../hooks/useReporteReal';
import { formatCurrency as formatearDinero } from "../utils/formatCurrency";
import { useState } from "react";

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

  const [desde,setDesde]=useState(''),[hasta,setHasta]=useState(''),[pagina,setPagina]=useState(1);
  const resource=useReporteReal('caja',periodo,desde,hasta,pagina);
  const {cierres,totalIngresos,totalSalidas,balanceTotal,diferenciaTotal}=resource.data||{cierres:[],totalIngresos:null,totalSalidas:0,balanceTotal:0,diferenciaTotal:'0.00'};
  const movimientoDiario=cierres.map(c=>({id:c.id,fecha:c.fecha,ingresos:c.balance,salidas:c.salidas}));
  const maxMovimiento=decimalReporte(movimientoDiario.flatMap(c=>[c.ingresos,c.salidas]).reduce((m,v)=>centavosReporte(v)>m?centavosReporte(v):m,0n));

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
            Consulta pagos verificados y el arqueo real de los cierres.
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
              (setPeriodo(event.target.value),setPagina(1))
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

      <ReporteControles resource={resource} periodo={periodo} desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} setPagina={setPagina} nota="Resumen de pagos y cierres del período seleccionado."/>
      <ReporteRemote resource={resource}>
      {!cierres.length&&<p>No hay cierres en este período.</p>}
      <section className="reporte-caja-kpis">

        <article className="reporte-caja-kpi">

          <div className="reporte-caja-kpi-icon income">
            <ArrowDownToLine
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Ingresos verificados
          </span>

          <strong>
            {formatearDinero(totalIngresos)}
          </strong>

          <small>
            Pagos verificados del período
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
            Pagos pendientes
          </span>

          <strong>
            {totalSalidas}
          </strong>

          <small>
            Pendientes de verificación
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
            Pagos verificados
          </span>

          <strong>
            {balanceTotal}
          </strong>

          <small>
            Pagos verificados
          </small>

        </article>

        <article className="reporte-caja-kpi">

          <div
            className={`reporte-caja-kpi-icon difference ${
              diferenciaTotal === '0.00' ? "ok" : "alert"
            }`}
          >
            {diferenciaTotal === '0.00' ? (
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
            Diferencia de los cierres mostrados
          </span>

          <strong>
            {formatearDinero(diferenciaTotal)}
          </strong>

          <small>
            {diferenciaTotal === '0.00'
              ? "Sin diferencia en los cierres mostrados"
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
                  Efectivo esperado vs. contado
                </h3>

                <p>
                  Totales de los cierres mostrados
                </p>
              </div>

            </div>

          </div>

          <div className="reporte-caja-chart">

            {movimientoDiario.map((registro) => {
              const alturaIngresos =
                porcentajeReporte(registro.ingresos,maxMovimiento);

              const alturaSalidas =
                porcentajeReporte(registro.salidas,maxMovimiento);

              return (
                <div
                  key={registro.id}
                  className="reporte-caja-chart-group"
                >

                  <div className="reporte-caja-bars">

                    <div
                      className="reporte-caja-bar ingreso"
                      style={{
                        height: `${alturaIngresos}%`,
                      }}
                      title={`Esperado ${formatearDinero(
                        registro.ingresos
                      )}`}
                    ></div>

                    <div
                      className="reporte-caja-bar salida"
                      style={{
                        height: `${alturaSalidas}%`,
                      }}
                      title={`Contado ${formatearDinero(
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
              Efectivo esperado
            </span>

            <span>
              <i className="legend-output"></i>
              Efectivo contado
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
                  : "Sin diferencias en los cierres mostrados"}
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
                <th>Total del cierre</th>
                <th>Efectivo contado</th>
                <th>Efectivo esperado</th>
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
                  Total del cierre
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
                  Efectivo contado
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
                  Efectivo esperado
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
                cierreSeleccionado.diferencia === '0.00'
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

      <ReportePaginacion resource={resource} pagina={pagina} setPagina={setPagina}/>
      </ReporteRemote>
    </div>
  );
}

export default ReporteCajaSection;