import { useMemo, useState } from "react";

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

  const transacciones = [
    {
      id: "TX-1048",
      hora: "16:40",
      mesa: "Mesa 4",
      pedido: "P-3842",
      total: 86000,
      metodo: "Nequi",
      responsable: "Laura",
    },
    {
      id: "TX-1047",
      hora: "15:55",
      mesa: "Mesa 8",
      pedido: "P-3847",
      total: 38000,
      metodo: "Efectivo",
      responsable: "Daniela",
    },
    {
      id: "TX-1046",
      hora: "15:20",
      mesa: "Mesa 2",
      pedido: "P-3845",
      total: 54000,
      metodo: "Tarjeta",
      responsable: "Carlos",
    },
    {
      id: "TX-1045",
      hora: "14:35",
      mesa: "Mesa 6",
      pedido: "P-3839",
      total: 112000,
      metodo: "Daviplata",
      responsable: "Laura",
    },
    {
      id: "TX-1044",
      hora: "13:20",
      mesa: "Mesa 5",
      pedido: "P-3835",
      total: 76000,
      metodo: "Efectivo",
      responsable: "Carlos",
    },
  ];

  const ventasPorHora = [
    { hora: "10:00", valor: 180000 },
    { hora: "11:00", valor: 265000 },
    { hora: "12:00", valor: 410000 },
    { hora: "13:00", valor: 520000 },
    { hora: "14:00", valor: 360000 },
    { hora: "15:00", valor: 485000 },
    { hora: "16:00", valor: 390000 },
  ];

  const ventasNetas = 2610000;
  const numeroTransacciones = 37;
  const ticketPromedio = ventasNetas / numeroTransacciones;

  const metodosPago = useMemo(() => {
    return transacciones.reduce((acumulado, transaccion) => {
      acumulado[transaccion.metodo] =
        (acumulado[transaccion.metodo] || 0) + transaccion.total;

      return acumulado;
    }, {});
  }, [transacciones]);

  const metodoPrincipal =
    Object.entries(metodosPago).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "Sin datos";

  const valorMaximo = Math.max(
    ...ventasPorHora.map((registro) => registro.valor)
  );

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

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
          <h2>Resumen de ventas</h2>

          <p>
            Comportamiento comercial según el período seleccionado.
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

      <section className="reporte-ventas-kpis">

        <article className="reporte-venta-kpi">

          <div className="reporte-venta-kpi-icon sales">
            <BadgeDollarSign size={20} strokeWidth={1.9} />
          </div>

          <span>Ventas netas</span>

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

          <span>Ticket promedio</span>

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
                  Ventas por hora
                </h3>

                <p>
                  Distribución del ingreso durante la jornada
                </p>
              </div>

            </div>

          </div>

          <div className="ventas-hour-chart">

            {ventasPorHora.map((registro) => {
              const porcentaje =
                (registro.valor / valorMaximo) * 100;

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
                        height: `${Math.max(
                          porcentaje,
                          10
                        )}%`,
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

    </div>
  );
}

export default ReporteVentasSection;