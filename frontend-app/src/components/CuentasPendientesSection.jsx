import { useMemo, useState } from "react";
import "./CuentasPendientesSection.css";

function CuentasPendientesSection() {
  const [busqueda, setBusqueda] = useState("");
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [mostrarDivision, setMostrarDivision] = useState(false);
  const [valorPago, setValorPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  const [cuentas, setCuentas] = useState([
    {
      id: 1,
      pedido: "P-3839",
      mesa: "Mesa 6",
      mesero: "Laura",
      tiempo: "42 min",
      total: 112000,
      pagado: 40000,
      productos: [
        {
          nombre: "Aguardiente Antioqueño",
          cantidad: 1,
          subtotal: 65000,
        },
        {
          nombre: "Coca-Cola 400ml",
          cantidad: 2,
          subtotal: 14000,
        },
        {
          nombre: "Papas",
          cantidad: 2,
          subtotal: 18000,
        },
        {
          nombre: "Sesión de tejo",
          cantidad: 1,
          subtotal: 15000,
        },
      ],
      pagos: [
        {
          id: "PG-895",
          metodo: "Nequi",
          valor: 40000,
          hora: "15:12",
        },
      ],
    },
    {
      id: 2,
      pedido: "P-3842",
      mesa: "Mesa 4",
      mesero: "Carlos",
      tiempo: "24 min",
      total: 86000,
      pagado: 0,
      productos: [
        {
          nombre: "Poker 330ml",
          cantidad: 4,
          subtotal: 28000,
        },
        {
          nombre: "Club Colombia",
          cantidad: 2,
          subtotal: 18000,
        },
        {
          nombre: "Sesión de billar",
          cantidad: 1,
          subtotal: 40000,
        },
      ],
      pagos: [],
    },
    {
      id: 3,
      pedido: "P-3845",
      mesa: "Mesa 2",
      mesero: "Daniela",
      tiempo: "18 min",
      total: 54000,
      pagado: 20000,
      productos: [
        {
          nombre: "Ron Medellín",
          cantidad: 1,
          subtotal: 42000,
        },
        {
          nombre: "Coca-Cola 400ml",
          cantidad: 1,
          subtotal: 7000,
        },
        {
          nombre: "Hielo",
          cantidad: 1,
          subtotal: 5000,
        },
      ],
      pagos: [
        {
          id: "PG-897",
          metodo: "Efectivo",
          valor: 20000,
          hora: "15:30",
        },
      ],
    },
  ]);

  const cuentasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return cuentas.filter(
      (cuenta) =>
        cuenta.pedido.toLowerCase().includes(texto) ||
        cuenta.mesa.toLowerCase().includes(texto) ||
        cuenta.mesero.toLowerCase().includes(texto)
    );
  }, [cuentas, busqueda]);

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function obtenerSaldo(cuenta) {
    return cuenta.total - cuenta.pagado;
  }

  function abrirCuenta(cuenta) {
    setCuentaSeleccionada(cuenta);
    setMostrarPago(false);
    setMostrarDivision(false);
    setValorPago("");
  }

  function cerrarCuenta() {
    setCuentaSeleccionada(null);
    setMostrarPago(false);
    setMostrarDivision(false);
    setValorPago("");
  }

  function registrarPago() {
    if (!cuentaSeleccionada) return;

    const valor = Number(valorPago);
    const saldoActual = obtenerSaldo(cuentaSeleccionada);

    if (!valor || valor <= 0 || valor > saldoActual) {
      return;
    }

    const nuevoPago = {
      id: `PG-${900 + Math.floor(Math.random() * 90)}`,
      metodo: metodoPago,
      valor,
      hora: "16:52",
    };

    const nuevoPagado = cuentaSeleccionada.pagado + valor;

    setCuentas((actuales) =>
      actuales.map((cuenta) =>
        cuenta.id === cuentaSeleccionada.id
          ? {
              ...cuenta,
              pagado: nuevoPagado,
              pagos: [...cuenta.pagos, nuevoPago],
            }
          : cuenta
      )
    );

    setCuentaSeleccionada((actual) =>
      actual
        ? {
            ...actual,
            pagado: nuevoPagado,
            pagos: [...actual.pagos, nuevoPago],
          }
        : null
    );

    setValorPago("");
    setMostrarPago(false);
  }

  return (
    <div className="cuentas-pendientes-section">

      <section className="cuentas-pendientes-toolbar">

        <div>
          <h2>Cuentas abiertas</h2>

          <p>
            Controla saldos pendientes y pagos parciales.
          </p>
        </div>

        <div className="cuentas-pendientes-search">
          <input
            type="text"
            placeholder="Buscar mesa, pedido o mesero..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
        </div>

      </section>

      <section className="cuentas-pendientes-kpis">

        <article className="cuenta-kpi">
          <span>Cuentas pendientes</span>
          <strong>{cuentas.length}</strong>
          <small>Actualmente abiertas</small>
        </article>

        <article className="cuenta-kpi">
          <span>Total facturado</span>
          <strong>
            {formatearDinero(
              cuentas.reduce(
                (total, cuenta) => total + cuenta.total,
                0
              )
            )}
          </strong>
          <small>Consumo acumulado</small>
        </article>

        <article className="cuenta-kpi">
          <span>Pagado</span>
          <strong>
            {formatearDinero(
              cuentas.reduce(
                (total, cuenta) => total + cuenta.pagado,
                0
              )
            )}
          </strong>
          <small>Abonos registrados</small>
        </article>

        <article className="cuenta-kpi">
          <span>Saldo pendiente</span>
          <strong>
            {formatearDinero(
              cuentas.reduce(
                (total, cuenta) =>
                  total + obtenerSaldo(cuenta),
                0
              )
            )}
          </strong>
          <small>Por cobrar</small>
        </article>

      </section>

      <section className="cuentas-pendientes-panel">

        <div className="cuentas-pendientes-panel-header">
          <div>
            <h2>Detalle de cuentas</h2>
            <p>
              {cuentasFiltradas.length} cuentas encontradas
            </p>
          </div>
        </div>

        <div className="cuentas-pendientes-table-wrapper">

          <table className="cuentas-pendientes-table">

            <thead>
              <tr>
                <th>Mesa</th>
                <th>Pedido</th>
                <th>Mesero</th>
                <th>Tiempo</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Saldo</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {cuentasFiltradas.map((cuenta) => (
                <tr key={cuenta.id}>

                  <td>
                    <strong>{cuenta.mesa}</strong>
                  </td>

                  <td>{cuenta.pedido}</td>

                  <td>{cuenta.mesero}</td>

                  <td>{cuenta.tiempo}</td>

                  <td>
                    {formatearDinero(cuenta.total)}
                  </td>

                  <td>
                    {formatearDinero(cuenta.pagado)}
                  </td>

                  <td>
                    <strong className="cuenta-saldo">
                      {formatearDinero(
                        obtenerSaldo(cuenta)
                      )}
                    </strong>
                  </td>

                  <td>
                    <div className="cuenta-row-actions">

                      <button
                        className="cuenta-pay-button"
                        onClick={() => abrirCuenta(cuenta)}
                      >
                        Cobrar
                      </button>

                      <button
                        className="cuenta-detail-button"
                        onClick={() => abrirCuenta(cuenta)}
                      >
                        Ver cuenta
                      </button>

                    </div>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </section>

      {cuentaSeleccionada && (
        <>
          <div
            className="cuenta-overlay"
            onClick={cerrarCuenta}
          ></div>

          <aside className="cuenta-drawer">

            <div className="cuenta-drawer-header">

              <div>
                <p className="page-eyebrow">
                  CUENTA PENDIENTE
                </p>

                <h2>{cuentaSeleccionada.mesa}</h2>

                <span>
                  {cuentaSeleccionada.pedido}
                </span>
              </div>

              <button
                className="drawer-close"
                onClick={cerrarCuenta}
              >
                ×
              </button>

            </div>

            <div className="cuenta-detail-summary">

              <div>
                <span>Mesero</span>
                <strong>
                  {cuentaSeleccionada.mesero}
                </strong>
              </div>

              <div>
                <span>Tiempo abierto</span>
                <strong>
                  {cuentaSeleccionada.tiempo}
                </strong>
              </div>

            </div>

            <div className="cuenta-products">

              <h3>Productos y servicios</h3>

              {cuentaSeleccionada.productos.map(
                (producto, index) => (
                  <div
                    key={index}
                    className="cuenta-product-row"
                  >
                    <div>
                      <strong>
                        {producto.nombre}
                      </strong>

                      <span>
                        Cantidad: {producto.cantidad}
                      </span>
                    </div>

                    <strong>
                      {formatearDinero(
                        producto.subtotal
                      )}
                    </strong>
                  </div>
                )
              )}

            </div>

            <div className="cuenta-totals">

              <div>
                <span>Total</span>
                <strong>
                  {formatearDinero(
                    cuentaSeleccionada.total
                  )}
                </strong>
              </div>

              <div>
                <span>Pagado</span>
                <strong>
                  {formatearDinero(
                    cuentaSeleccionada.pagado
                  )}
                </strong>
              </div>

              <div className="cuenta-total-pending">
                <span>Saldo pendiente</span>
                <strong>
                  {formatearDinero(
                    obtenerSaldo(cuentaSeleccionada)
                  )}
                </strong>
              </div>

            </div>

            {cuentaSeleccionada.pagos.length > 0 && (
              <div className="cuenta-payment-history">

                <h3>Pagos realizados</h3>

                {cuentaSeleccionada.pagos.map(
                  (pago) => (
                    <div
                      key={pago.id}
                      className="cuenta-payment-row"
                    >
                      <div>
                        <strong>{pago.metodo}</strong>

                        <span>
                          {pago.id} · {pago.hora}
                        </span>
                      </div>

                      <strong>
                        {formatearDinero(pago.valor)}
                      </strong>
                    </div>
                  )
                )}

              </div>
            )}

            {!mostrarPago && !mostrarDivision && (
              <div className="cuenta-actions">

                <button
                  className="drawer-primary-button"
                  onClick={() => setMostrarPago(true)}
                >
                  Registrar pago
                </button>

                <button
                  className="drawer-secondary-button"
                  onClick={() => setMostrarDivision(true)}
                >
                  Dividir cuenta
                </button>

              </div>
            )}

            {mostrarPago && (
              <div className="cuenta-payment-form">

                <h3>Registrar pago</h3>

                <label>
                  Valor
                  <input
                    type="number"
                    placeholder="Valor del pago"
                    value={valorPago}
                    onChange={(event) =>
                      setValorPago(event.target.value)
                    }
                  />
                </label>

                <label>
                  Método de pago
                  <select
                    value={metodoPago}
                    onChange={(event) =>
                      setMetodoPago(event.target.value)
                    }
                  >
                    <option>Efectivo</option>
                    <option>Nequi</option>
                    <option>Daviplata</option>
                    <option>Tarjeta</option>
                  </select>
                </label>

                <div className="cuenta-form-actions">

                  <button
                    className="drawer-primary-button"
                    onClick={registrarPago}
                  >
                    Confirmar pago
                  </button>

                  <button
                    className="drawer-secondary-button"
                    onClick={() => {
                      setMostrarPago(false);
                      setValorPago("");
                    }}
                  >
                    Cancelar
                  </button>

                </div>

              </div>
            )}

            {mostrarDivision && (
              <div className="cuenta-split-box">

                <h3>Dividir cuenta</h3>

                <p>
                  Esta función permitirá dividir el saldo
                  pendiente entre varias personas o pagos.
                </p>

                <div className="cuenta-split-example">

                  <span>Saldo actual</span>

                  <strong>
                    {formatearDinero(
                      obtenerSaldo(cuentaSeleccionada)
                    )}
                  </strong>

                </div>

                <button
                  className="drawer-secondary-button"
                  onClick={() =>
                    setMostrarDivision(false)
                  }
                >
                  Volver
                </button>

              </div>
            )}

          </aside>
        </>
      )}

    </div>
  );
}

export default CuentasPendientesSection;