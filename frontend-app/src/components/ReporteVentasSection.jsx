import ReporteRemote, {ReporteControles,ReportePaginacion} from './ReporteRemote';
import {useReporteReal} from '../hooks/useReporteReal';
import { formatCurrency as formatearDinero } from "../utils/formatCurrency";
import { useState } from "react";

import {
  BarChart3,
  ReceiptText,
  BadgeDollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  Clock3,
  Armchair,
  UserRound,
  ArrowRight,
  X,
  LockKeyhole,
  CalendarRange,
} from "lucide-react";

import "./ReporteVentasSection.css";

function ReporteVentasSection() {
  const [periodo, setPeriodo] = useState("hoy");
  const [transaccionSeleccionada, setTransaccionSeleccionada] = useState(null);

  const [desde,setDesde]=useState(''),[hasta,setHasta]=useState(''),[pagina,setPagina]=useState(1);
  const resource=useReporteReal('ventas',periodo,desde,hasta,pagina);
  const {ventasNetas,numeroTransacciones,ticketPromedio,metodosPago,metodoPrincipal,ventasPorHora}=resource.data||{ventasNetas:null,numeroTransacciones:0,ticketPromedio:null,metodosPago:{},metodoPrincipal:'Sin datos',ventasPorHora:[]};
  const transacciones=resource.data?.transacciones||[];

  function iconoMetodo(metodo) {
    if (metodo === "Efectivo") {
      return <Banknote size={15} strokeWidth={1.9} />;
    }

    if (metodo === "Tarjeta") {
      return <CreditCard size={15} strokeWidth={1.9} />;
    }

    return <Smartphone size={15} strokeWidth={1.9} />;
  }

  return (
    <div className="reporte-ventas-section">

      <section className="reporte-ventas-toolbar">

        <div>
          <h2>Resumen de ingresos verificados</h2>

          <p>
            Consulta los ingresos del período seleccionado.
          </p>
        </div>

        <div className="reporte-ventas-periodo">

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
            <option value="hoy">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="personalizado">Personalizado</option>
          </select>

        </div>

      </section>

      <ReporteControles resource={resource} periodo={periodo} desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} setPagina={setPagina} nota="Pagos confirmados durante el período seleccionado."/>
      <ReporteRemote resource={resource}>
      {!transacciones.length&&<p>No hay pagos verificados en este período.</p>}
      <section className="reporte-ventas-kpis">

        <article className="reporte-venta-kpi">

          <div className="reporte-venta-kpi-icon sales">
            <BadgeDollarSign size={20} strokeWidth={1.9} />
          </div>

          <span>Ingresos verificados</span>

          <strong>
            {formatearDinero(ventasNetas)}
          </strong>

          <small>
            Período seleccionado
          </small>

        </article>

        <article className="reporte-venta-kpi">

          <div className="reporte-venta-kpi-icon transactions">
            <ReceiptText size={20} strokeWidth={1.9} />
          </div>

          <span>Transacciones</span>

          <strong>
            {numeroTransacciones}
          </strong>

          <small>
            Pagos confirmados
          </small>

        </article>

        <article className="reporte-venta-kpi">

          <div className="reporte-venta-kpi-icon average">
            <BarChart3 size={20} strokeWidth={1.9} />
          </div>

          <span>Promedio por pago</span>

          <strong>
            {formatearDinero(ticketPromedio)}
          </strong>

          <small>
            Promedio por transacción
          </small>

        </article>

        <article className="reporte-venta-kpi">

          <div className="reporte-venta-kpi-icon method">
            <CreditCard size={20} strokeWidth={1.9} />
          </div>

          <span>Método principal</span>

          <strong>
            {metodoPrincipal}
          </strong>

          <small>
            Mayor valor registrado
          </small>

        </article>

      </section>

      <section className="reporte-ventas-main-grid">

        <article className="reporte-ventas-panel">

          <div className="reporte-ventas-panel-header">

            <div className="reporte-ventas-panel-title">

              <div className="reporte-ventas-panel-icon">
                <BarChart3 size={18} strokeWidth={1.9} />
              </div>

              <div>
                <h3>
                  Ingresos por fecha
                </h3>

                <p>
                  Ingresos por fecha de pago
                </p>
              </div>

            </div>

          </div>

          <div className="ventas-hour-chart">

            {ventasPorHora.map((registro) => {
              const porcentaje = registro.altura;

              return (
                <div
                  key={registro.hora}
                  className="ventas-hour-item"
                >

                  <div className="ventas-hour-value">
                    {formatearDinero(registro.valor)}
                  </div>

                  <div className="ventas-hour-bar-area">

                    <div
                      className="ventas-hour-bar"
                      style={{
                        height: `${porcentaje}%`,
                      }}
                    ></div>

                  </div>

                  <span>
                    {registro.hora}
                  </span>

                </div>
              );
            })}

          </div>
          {resource.data&&!resource.data.serieDisponible&&<p>La evolución diaria se muestra para períodos de hasta 31 días. Los totales y métodos incluyen todo el período.</p>}
        </article>

        <article className="reporte-ventas-panel">

          <div className="reporte-ventas-panel-header">

            <div className="reporte-ventas-panel-title">

              <div className="reporte-ventas-panel-icon">
                <CreditCard size={18} strokeWidth={1.9} />
              </div>

              <div>
                <h3>
                  Métodos de pago
                </h3>

                <p>
                  Distribución de las transacciones recientes
                </p>
              </div>

            </div>

          </div>

          <div className="reporte-payment-list">

            {Object.entries(metodosPago).map(
              ([metodo, valor]) => (

                <div
                  key={metodo}
                  className="reporte-payment-row"
                >

                  <div className="reporte-payment-info">

                    <span className="reporte-payment-icon">
                      {iconoMetodo(metodo)}
                    </span>

                    <div>
                      <strong>
                        {metodo}
                      </strong>

                      <span>
                        Método de pago
                      </span>
                    </div>

                  </div>

                  <strong>
                    {formatearDinero(valor)}
                  </strong>

                </div>

              )
            )}

          </div>

        </article>

      </section>

      <section className="reporte-ventas-panel">

        <div className="reporte-ventas-panel-header">

          <div className="reporte-ventas-panel-title">

            <div className="reporte-ventas-panel-icon">
              <ReceiptText size={18} strokeWidth={1.9} />
            </div>

            <div>
              <h3>
                Transacciones recientes
              </h3>

              <p>
                Últimos pagos registrados en el sistema
              </p>
            </div>

          </div>

          <span className="reporte-ventas-readonly-badge">
            <LockKeyhole size={13} strokeWidth={1.9} />
            Solo consulta
          </span>

        </div>

        <div className="reporte-ventas-table-wrapper">

          <table className="reporte-ventas-table">

            <thead>
              <tr>
                <th>Transacción</th>
                <th>Hora</th>
                <th>Mesa</th>
                <th>Pedido</th>
                <th>Método</th>
                <th>Total</th>
                <th>Responsable</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {transacciones.map((transaccion) => (

                <tr key={transaccion.id}>

                  <td>
                    <span className="reporte-transaction-code">
                      {transaccion.id}
                    </span>
                  </td>

                  <td>
                    {transaccion.hora}
                  </td>

                  <td>
                    {transaccion.mesa}
                  </td>

                  <td>
                    {transaccion.pedido}
                  </td>

                  <td>
                    <span className="reporte-payment-chip">

                      {iconoMetodo(
                        transaccion.metodo
                      )}

                      {transaccion.metodo}

                    </span>
                  </td>

                  <td>
                    <strong>
                      {formatearDinero(
                        transaccion.total
                      )}
                    </strong>
                  </td>

                  <td>
                    {transaccion.responsable}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="reporte-detail-button"
                      onClick={() =>
                        setTransaccionSeleccionada(
                          transaccion
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

              ))}

            </tbody>

          </table>

        </div>

      </section>

      {transaccionSeleccionada && (
        <>

          <div
            className="reporte-ventas-overlay"
            onClick={() =>
              setTransaccionSeleccionada(null)
            }
          ></div>

          <aside className="reporte-ventas-drawer">

            <div className="reporte-ventas-drawer-header">

              <div>
                <p className="page-eyebrow">
                  TRANSACCIÓN
                </p>

                <h2>
                  {transaccionSeleccionada.id}
                </h2>

                <span>
                  {transaccionSeleccionada.pedido}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setTransaccionSeleccionada(null)
                }
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div className="reporte-ventas-detail-grid">

              <div>
                <span>Mesa</span>

                <strong>
                  <Armchair size={14} strokeWidth={1.9} />
                  {transaccionSeleccionada.mesa}
                </strong>
              </div>

              <div>
                <span>Hora</span>

                <strong>
                  <Clock3 size={14} strokeWidth={1.9} />
                  {transaccionSeleccionada.hora}
                </strong>
              </div>

              <div>
                <span>Método de pago</span>

                <strong>
                  {iconoMetodo(
                    transaccionSeleccionada.metodo
                  )}

                  {transaccionSeleccionada.metodo}
                </strong>
              </div>

              <div>
                <span>Responsable</span>

                <strong>
                  <UserRound size={14} strokeWidth={1.9} />
                  {transaccionSeleccionada.responsable}
                </strong>
              </div>

            </div>

            <div className="reporte-ventas-total">

              <div className="reporte-ventas-total-icon">
                <BadgeDollarSign
                  size={21}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <span>
                  Total de la transacción
                </span>

                <strong>
                  {formatearDinero(
                    transaccionSeleccionada.total
                  )}
                </strong>
              </div>

            </div>

            <div className="reporte-ventas-readonly">

              <LockKeyhole
                size={17}
                strokeWidth={1.9}
              />

              <span>
                Este registro corresponde a una transacción confirmada y es de solo consulta.
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

export default ReporteVentasSection;