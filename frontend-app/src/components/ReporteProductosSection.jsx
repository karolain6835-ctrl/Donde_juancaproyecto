import { useMemo, useState } from "react";
import "./ReporteProductosSection.css";

function ReporteProductosSection() {
  const [periodo, setPeriodo] = useState("hoy");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const productos = [
    {
      id: 1,
      posicion: 1,
      producto: "Poker 330ml",
      categoria: "Cervezas",
      unidades: 84,
      ingresos: 588000,
    },
    {
      id: 2,
      posicion: 2,
      producto: "Aguardiente Antioqueño",
      categoria: "Licores",
      unidades: 31,
      ingresos: 511500,
    },
    {
      id: 3,
      posicion: 3,
      producto: "Club Colombia",
      categoria: "Cervezas",
      unidades: 46,
      ingresos: 414000,
    },
    {
      id: 4,
      posicion: 4,
      producto: "Coca-Cola 400ml",
      categoria: "Gaseosas",
      unidades: 52,
      ingresos: 364000,
    },
    {
      id: 5,
      posicion: 5,
      producto: "Ron Medellín 750ml",
      categoria: "Licores",
      unidades: 8,
      ingresos: 336000,
    },
    {
      id: 6,
      posicion: 6,
      producto: "Papas",
      categoria: "Comidas",
      unidades: 25,
      ingresos: 225000,
    },
  ];

  const ingresosTotales = useMemo(() => {
    return productos.reduce(
      (total, producto) => total + producto.ingresos,
      0
    );
  }, [productos]);

  const unidadesTotales = useMemo(() => {
    return productos.reduce(
      (total, producto) => total + producto.unidades,
      0
    );
  }, [productos]);

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function calcularParticipacion(ingresos) {
    return ((ingresos / ingresosTotales) * 100).toFixed(1);
  }

  return (
    <div className="reporte-productos-section">

      <section className="reporte-productos-toolbar">

        <div>
          <h2>Productos más vendidos</h2>
          <p>
            Identifica los productos con mayor movimiento e ingresos.
          </p>
        </div>

        <select
          value={periodo}
          onChange={(event) => setPeriodo(event.target.value)}
        >
          <option value="hoy">Hoy</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
          <option value="personalizado">Personalizado</option>
        </select>

      </section>

      <section className="reporte-productos-kpis">

        <article className="reporte-producto-kpi">
          <span>Unidades vendidas</span>
          <strong>{unidadesTotales}</strong>
          <small>Productos del ranking</small>
        </article>

        <article className="reporte-producto-kpi">
          <span>Ingresos generados</span>
          <strong>{formatearDinero(ingresosTotales)}</strong>
          <small>Ventas del ranking</small>
        </article>

        <article className="reporte-producto-kpi">
          <span>Producto líder</span>
          <strong>{productos[0].producto}</strong>
          <small>{productos[0].unidades} unidades</small>
        </article>

        <article className="reporte-producto-kpi">
          <span>Categoría líder</span>
          <strong>Cervezas</strong>
          <small>Mayor participación</small>
        </article>

      </section>

      <section className="reporte-productos-main-grid">

        <article className="reporte-productos-panel">

          <div className="reporte-productos-panel-header">
            <div>
              <h3>Ranking por unidades</h3>
              <p>Volumen de productos vendidos</p>
            </div>
          </div>

          <div className="productos-ranking">

            {productos.slice(0, 5).map((producto) => {
              const maximo = productos[0].unidades;
              const porcentaje =
                (producto.unidades / maximo) * 100;

              return (
                <div
                  key={producto.id}
                  className="producto-ranking-row"
                >

                  <div className="producto-ranking-position">
                    {producto.posicion}
                  </div>

                  <div className="producto-ranking-content">

                    <div className="producto-ranking-info">

                      <div>
                        <strong>{producto.producto}</strong>
                        <span>{producto.categoria}</span>
                      </div>

                      <strong>
                        {producto.unidades} und.
                      </strong>

                    </div>

                    <div className="producto-ranking-track">
                      <div
                        className="producto-ranking-bar"
                        style={{
                          width: `${porcentaje}%`,
                        }}
                      ></div>
                    </div>

                  </div>

                </div>
              );
            })}

          </div>

        </article>

        <article className="reporte-productos-panel">

          <div className="reporte-productos-panel-header">
            <div>
              <h3>Participación en ingresos</h3>
              <p>Peso de cada producto dentro del ranking</p>
            </div>
          </div>

          <div className="productos-share-list">

            {productos.slice(0, 5).map((producto) => (
              <div
                key={producto.id}
                className="productos-share-row"
              >

                <div>
                  <strong>{producto.producto}</strong>

                  <span>
                    {producto.categoria}
                  </span>
                </div>

                <div className="producto-share-values">
                  <strong>
                    {formatearDinero(producto.ingresos)}
                  </strong>

                  <span>
                    {calcularParticipacion(producto.ingresos)}%
                  </span>
                </div>

              </div>
            ))}

          </div>

        </article>

      </section>

      <section className="reporte-productos-panel">

        <div className="reporte-productos-panel-header">

          <div>
            <h3>Detalle de productos vendidos</h3>

            <p>
              Ranking según unidades e ingresos generados
            </p>
          </div>

        </div>

        <div className="reporte-productos-table-wrapper">

          <table className="reporte-productos-table">

            <thead>
              <tr>
                <th>Posición</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Unidades</th>
                <th>Ingresos</th>
                <th>Participación</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {productos.map((producto) => (
                <tr key={producto.id}>

                  <td>
                    <span className="producto-position-chip">
                      #{producto.posicion}
                    </span>
                  </td>

                  <td>
                    <strong>{producto.producto}</strong>
                  </td>

                  <td>{producto.categoria}</td>

                  <td>
                    <strong>{producto.unidades}</strong>
                  </td>

                  <td>
                    {formatearDinero(producto.ingresos)}
                  </td>

                  <td>
                    {calcularParticipacion(
                      producto.ingresos
                    )}
                    %
                  </td>

                  <td>
                    <button
                      className="reporte-producto-detail-button"
                      onClick={() =>
                        setProductoSeleccionado(producto)
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

      {productoSeleccionado && (
        <>
          <div
            className="reporte-producto-overlay"
            onClick={() =>
              setProductoSeleccionado(null)
            }
          ></div>

          <aside className="reporte-producto-drawer">

            <div className="reporte-producto-drawer-header">

              <div>
                <p className="page-eyebrow">
                  PRODUCTO
                </p>

                <h2>
                  {productoSeleccionado.producto}
                </h2>

                <span>
                  {productoSeleccionado.categoria}
                </span>
              </div>

              <button
                className="drawer-close"
                onClick={() =>
                  setProductoSeleccionado(null)
                }
              >
                ×
              </button>

            </div>

            <div className="producto-rank-box">

              <span>Posición en el ranking</span>

              <strong>
                #{productoSeleccionado.posicion}
              </strong>

            </div>

            <div className="reporte-producto-detail-grid">

              <div>
                <span>Unidades vendidas</span>
                <strong>
                  {productoSeleccionado.unidades}
                </strong>
              </div>

              <div>
                <span>Ingresos</span>
                <strong>
                  {formatearDinero(
                    productoSeleccionado.ingresos
                  )}
                </strong>
              </div>

              <div>
                <span>Participación</span>
                <strong>
                  {calcularParticipacion(
                    productoSeleccionado.ingresos
                  )}
                  %
                </strong>
              </div>

              <div>
                <span>Ingreso promedio por unidad</span>
                <strong>
                  {formatearDinero(
                    productoSeleccionado.ingresos /
                      productoSeleccionado.unidades
                  )}
                </strong>
              </div>

            </div>

            <div className="reporte-producto-readonly">
              Este reporte es informativo. La configuración del producto
              se administra desde el módulo de Inventario.
            </div>

          </aside>
        </>
      )}

    </div>
  );
}

export default ReporteProductosSection;