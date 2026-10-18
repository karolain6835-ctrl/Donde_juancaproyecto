import ReporteRemote, {ReporteControles,ReportePaginacion} from './ReporteRemote';
import {useReporteReal} from '../hooks/useReporteReal';
import { formatCurrency as formatearDinero } from "../utils/formatCurrency";
import { useState } from "react";

import {
  Boxes,
  TriangleAlert,
  PackageX,
  ArrowLeftRight,
  Tags,
  BarChart3,
  CalendarRange,
  BadgeDollarSign,
  PackageSearch,
  ArrowRight,
  X,
  LockKeyhole,
  Layers3,
} from "lucide-react";

import "./ReporteInventarioSection.css";

function ReporteInventarioSection() {
  const periodo="actual";
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const [desde,setDesde]=useState(''),[hasta,setHasta]=useState(''),[pagina,setPagina]=useState(1);
  const resource=useReporteReal('inventario',periodo,desde,hasta,pagina);
  const {productosCriticos,categorias,valorInventario,stockBajo,agotados,movimientos,alertasActivas}=resource.data||{productosCriticos:[],categorias:[],valorInventario:null,stockBajo:0,agotados:0,movimientos:0,alertasActivas:0};

  function nombreEstado(estado) {
    if (estado === "bajo") return "Stock bajo";
    if (estado === "critico") return "Crítico";
    if (estado === "agotado") return "Agotado";

    return estado;
  }

  function iconoEstado(estado) {
    if (estado === "agotado") {
      return <PackageX size={14} strokeWidth={1.9} />;
    }

    return <TriangleAlert size={14} strokeWidth={1.9} />;
  }

  return (
    <div className="reporte-inventario-section">

      <section className="reporte-inventario-toolbar">

        <div>
          <h2>
            Estado del inventario
          </h2>

          <p>
            Analiza valor, disponibilidad y movimientos de existencias.
          </p>
        </div>

        <div className="reporte-inventario-periodo">

          <CalendarRange
            size={16}
            strokeWidth={1.9}
          />

          <span>Existencias actuales</span>

        </div>

      </section>

      <ReporteControles resource={resource} periodo={'actual'} desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} setPagina={setPagina} nota="Existencias actuales a costo promedio. Movimientos y alertas acumulados; no reconstruye existencias históricas."/>
      <ReporteRemote resource={resource}>
      {!productosCriticos.length&&<p>No hay productos con stock bajo o agotado.</p>}
      <p>Alertas activas: {alertasActivas}</p>
      <section className="reporte-inventario-kpis">

        <article className="reporte-inventario-kpi">

          <div className="reporte-inventario-kpi-icon value">
            <BadgeDollarSign
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Valor del inventario
          </span>

          <strong>
            {formatearDinero(valorInventario)}
          </strong>

          <small>
            Stock × costo promedio actual
          </small>

        </article>

        <article className="reporte-inventario-kpi">

          <div className="reporte-inventario-kpi-icon warning">
            <TriangleAlert
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Stock bajo
          </span>

          <strong>
            {stockBajo}
          </strong>

          <small>
            Stock positivo igual o inferior al mínimo
          </small>

        </article>

        <article className="reporte-inventario-kpi">

          <div className="reporte-inventario-kpi-icon empty">
            <PackageX
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Agotados
          </span>

          <strong>
            {agotados}
          </strong>

          <small>
            Sin unidades disponibles
          </small>

        </article>

        <article className="reporte-inventario-kpi">

          <div className="reporte-inventario-kpi-icon movements">
            <ArrowLeftRight
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Movimientos
          </span>

          <strong>
            {movimientos}
          </strong>

          <small>
            Movimientos históricos acumulados
          </small>

        </article>

      </section>

      <section className="reporte-inventario-main-grid">

        <article className="reporte-inventario-panel">

          <div className="reporte-inventario-panel-header">

            <div className="reporte-inventario-panel-title">

              <div className="reporte-inventario-panel-icon">
                <Tags
                  size={18}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h3>
                  Valor por categoría
                </h3>

                <p>
                  Distribución del inventario actual
                </p>
              </div>

            </div>

          </div>

          <div className="inventario-category-list">

            {categorias.map((categoria) => (

              <div
                key={categoria.nombre}
                className="inventario-category-row"
              >

                <div className="inventario-category-info">

                  <div>
                    <strong>
                      {categoria.nombre}
                    </strong>

                    <span>
                      {formatearDinero(categoria.valor)}
                    </span>
                  </div>

                  <strong>
                    {categoria.porcentaje}%
                  </strong>

                </div>

                <div className="inventario-category-track">

                  <div
                    className="inventario-category-bar"
                    style={{
                      width: `${categoria.porcentaje}%`,
                    }}
                  ></div>

                </div>

              </div>

            ))}

          </div>

        </article>

        <article className="reporte-inventario-panel">

          <div className="reporte-inventario-panel-header">

            <div className="reporte-inventario-panel-title">

              <div className="reporte-inventario-panel-icon">
                <BarChart3
                  size={18}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h3>
                  Evolución del inventario
                </h3>

                <p>
                  Valor estimado durante los últimos días
                </p>
              </div>

            </div>

          </div>

          <div className="inventario-evolution-chart"><p>No existe una serie histórica de existencias valoradas. La valoración actual se calcula con stock y costo promedio reales.</p></div>

        </article>

      </section>

      <section className="reporte-inventario-panel">

        <div className="reporte-inventario-panel-header">

          <div className="reporte-inventario-panel-title">

            <div className="reporte-inventario-panel-icon critical">
              <PackageSearch
                size={18}
                strokeWidth={1.9}
              />
            </div>

            <div>
              <h3>
                Productos críticos
              </h3>

              <p>
                Referencias que requieren atención de inventario
              </p>
            </div>

          </div>

          <span className="reporte-inventario-readonly-badge">
            <LockKeyhole
              size={13}
              strokeWidth={1.9}
            />

            Solo consulta
          </span>

        </div>

        <div className="reporte-inventario-table-wrapper">

          <table className="reporte-inventario-table">

            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Stock actual</th>
                <th>Stock mínimo</th>
                <th>Valor actual</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {productosCriticos.map((producto) => (

                <tr key={producto.id}>

                  <td>
                    <strong>
                      {producto.producto}
                    </strong>
                  </td>

                  <td>
                    {producto.categoria}
                  </td>

                  <td>
                    {producto.stock}
                  </td>

                  <td>
                    {producto.minimo}
                  </td>

                  <td>
                    {formatearDinero(producto.valor)}
                  </td>

                  <td>
                    <span
                      className={`inventario-report-status ${producto.estado}`}
                    >
                      {iconoEstado(producto.estado)}

                      {nombreEstado(producto.estado)}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="reporte-inventario-detail-button"
                      onClick={() =>
                        setProductoSeleccionado(producto)
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

      {productoSeleccionado && (
        <>

          <div
            className="reporte-inventario-overlay"
            onClick={() =>
              setProductoSeleccionado(null)
            }
          ></div>

          <aside className="reporte-inventario-drawer">

            <div className="reporte-inventario-drawer-header">

              <div>
                <p className="page-eyebrow">
                  PRODUCTO CRÍTICO
                </p>

                <h2>
                  {productoSeleccionado.producto}
                </h2>

                <span>
                  {productoSeleccionado.categoria}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setProductoSeleccionado(null)
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
              className={`reporte-inventario-status-box ${productoSeleccionado.estado}`}
            >

              <span>
                Estado de inventario
              </span>

              <strong>
                {iconoEstado(
                  productoSeleccionado.estado
                )}

                {nombreEstado(
                  productoSeleccionado.estado
                )}
              </strong>

            </div>

            <div className="reporte-inventario-detail-grid">

              <div>
                <span>
                  Stock actual
                </span>

                <strong>
                  <Boxes
                    size={14}
                    strokeWidth={1.9}
                  />

                  {productoSeleccionado.stock}
                </strong>
              </div>

              <div>
                <span>
                  Stock mínimo
                </span>

                <strong>
                  <Layers3
                    size={14}
                    strokeWidth={1.9}
                  />

                  {productoSeleccionado.minimo}
                </strong>
              </div>

              <div>
                <span>
                  Diferencia
                </span>

                <strong className="reporte-inventario-difference">
                  <TriangleAlert
                    size={14}
                    strokeWidth={1.9}
                  />

                  {productoSeleccionado.stock -
                    productoSeleccionado.minimo}
                </strong>
              </div>

              <div>
                <span>
                  Valor actual
                </span>

                <strong>
                  <BadgeDollarSign
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(
                    productoSeleccionado.valor
                  )}
                </strong>
              </div>

            </div>

            <div className="reporte-inventario-notice">

              <LockKeyhole
                size={17}
                strokeWidth={1.9}
              />

              <span>
                Este reporte es informativo. Los ajustes de stock deben realizarse desde el módulo de Inventario para conservar el historial de movimientos.
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

export default ReporteInventarioSection;