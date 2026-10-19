import {porcentajeReporte} from '../services/reportesService';
import ReporteRemote, {ReporteControles,ReportePaginacion} from './ReporteRemote';
import {useReporteReal} from '../hooks/useReporteReal';
import { formatCurrency as formatearDinero } from "../utils/formatCurrency";
import { useState } from "react";

import {
  Trophy,
  Package,
  BadgeDollarSign,
  Tags,
  CalendarRange,
  BarChart3,
  ArrowRight,
  X,
  LockKeyhole,
  Boxes,
  Percent,
} from "lucide-react";

import "./ReporteProductosSection.css";

function ReporteProductosSection() {
  const [periodo, setPeriodo] = useState("hoy");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const [desde,setDesde]=useState(''),[hasta,setHasta]=useState(''),[pagina,setPagina]=useState(1);
  const resource=useReporteReal('productos',periodo,desde,hasta,pagina);
  const {productos,ingresosTotales,unidadesTotales,categoriaLider}=resource.data||{productos:[],ingresosTotales:null,unidadesTotales:0,categoriaLider:'Sin datos'};

  function calcularParticipacion(ingresos) {
    return porcentajeReporte(ingresos,ingresosTotales);
  }

  return (
    <div className="reporte-productos-section">

      <section className="reporte-productos-toolbar">

        <div>
          <h2>{resource.data?.rankingDisponible===false?'Catálogo de productos':'Productos consumidos'}</h2>

          <p>
            Consumos históricos de pedidos cerrados; no representa cobros.
          </p>
        </div>

        <div className="reporte-productos-periodo">

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

      <ReporteControles resource={resource} periodo={periodo} desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} setPagina={setPagina} nota="Productos de pedidos cerrados durante el período, con sus precios originales. No representa pagos recibidos."/>
      <ReporteRemote resource={resource}>
      {!productos.length&&<p>No hay consumos en este período.</p>}
      {resource.data?.rankingDisponible===false&&<p role="status">El historial supera 200 pedidos cerrados. No se calcula un ranking parcial; se muestra el catálogo real. Un reporte global requiere una fuente agregada.</p>}
      <section className="reporte-productos-kpis">

        <article className="reporte-producto-kpi">

          <div className="reporte-producto-kpi-icon units">
            <Boxes
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Unidades vendidas
          </span>

          <strong>
            {unidadesTotales}
          </strong>

          <small>
            Productos del ranking
          </small>

        </article>

        <article className="reporte-producto-kpi">

          <div className="reporte-producto-kpi-icon income">
            <BadgeDollarSign
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Valor histórico generado
          </span>

          <strong>
            {formatearDinero(ingresosTotales)}
          </strong>

          <small>
            Ventas del ranking
          </small>

        </article>

        <article className="reporte-producto-kpi">

          <div className="reporte-producto-kpi-icon leader">
            <Trophy
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Producto líder
          </span>

          <strong>
            {resource.data?.rankingDisponible===false?'No calculado':productos[0]?.producto||'Sin datos'}
          </strong>

          <small>
            {resource.data?.rankingDisponible===false?'—':productos[0]?.unidades||0} unidades
          </small>

        </article>

        <article className="reporte-producto-kpi">

          <div className="reporte-producto-kpi-icon category">
            <Tags
              size={20}
              strokeWidth={1.9}
            />
          </div>

          <span>
            Categoría líder
          </span>

          <strong>
            {categoriaLider}
          </strong>

          <small>
            Mayor participación
          </small>

        </article>

      </section>

      <section className="reporte-productos-main-grid">

        <article className="reporte-productos-panel">

          <div className="reporte-productos-panel-header">

            <div className="reporte-productos-panel-title">

              <div className="reporte-productos-panel-icon">
                <Trophy
                  size={18}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h3>
                  Ranking por unidades
                </h3>

                <p>
                  Volumen de productos vendidos
                </p>
              </div>

            </div>

          </div>

          <div className="productos-ranking">

            {productos.filter(p=>p.posicion!=null).slice(0, 5).map((producto) => {
              const maximo = productos[0]?.unidades||0;

              const porcentaje =
                (producto.unidades / maximo) * 100;

              return (
                <div
                  key={producto.id}
                  className="producto-ranking-row"
                >

                  <div
                    className={`producto-ranking-position posicion-${producto.posicion}`}
                  >
                    {producto.posicion}
                  </div>

                  <div className="producto-ranking-content">

                    <div className="producto-ranking-info">

                      <div>
                        <strong>
                          {producto.producto}
                        </strong>

                        <span>
                          {producto.categoria}
                        </span>
                      </div>

                      <strong>
                        {producto.unidades??'—'} und.
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

            <div className="reporte-productos-panel-title">

              <div className="reporte-productos-panel-icon">
                <BarChart3
                  size={18}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h3>
                  Participación en ingresos
                </h3>

                <p>
                  Peso de cada producto dentro del ranking
                </p>
              </div>

            </div>

          </div>

          <div className="productos-share-list">

            {productos.filter(p=>p.posicion!=null).slice(0, 5).map((producto) => (

              <div
                key={producto.id}
                className="productos-share-row"
              >

                <div>
                  <strong>
                    {producto.producto}
                  </strong>

                  <span>
                    {producto.categoria}
                  </span>
                </div>

                <div className="producto-share-values">

                  <strong>
                    {formatearDinero(
                      producto.ingresos
                    )}
                  </strong>

                  <span>
                    {calcularParticipacion(
                      producto.ingresos
                    )}%
                  </span>

                </div>

              </div>

            ))}

          </div>

        </article>

      </section>

      <section className="reporte-productos-panel">

        <div className="reporte-productos-panel-header">

          <div className="reporte-productos-panel-title">

            <div className="reporte-productos-panel-icon">
              <Package
                size={18}
                strokeWidth={1.9}
              />
            </div>

            <div>
              <h3>
                Detalle de productos vendidos
              </h3>

              <p>
                Consumos completos del período y valor histórico
              </p>
            </div>

          </div>

          <span className="reporte-productos-readonly-badge">
            <LockKeyhole
              size={13}
              strokeWidth={1.9}
            />

            Solo consulta
          </span>

        </div>

        <div className="reporte-productos-table-wrapper">

          <table className="reporte-productos-table">

            <thead>
              <tr>
                <th>Posición</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Unidades</th>
                <th>Valor histórico</th>
                <th>Participación</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {productos.map((producto) => (

                <tr key={producto.id}>

                  <td>
                    <span className="producto-position-chip">
                      {producto.posicion==null?'—':'#'+producto.posicion}
                    </span>
                  </td>

                  <td>
                    <strong>
                      {producto.producto}
                    </strong>
                  </td>

                  <td>
                    {producto.categoria}
                  </td>

                  <td>
                    <strong>
                      {producto.unidades??'—'}
                    </strong>
                  </td>

                  <td>
                    {formatearDinero(
                      producto.ingresos
                    )}
                  </td>

                  <td>
                    {calcularParticipacion(
                      producto.ingresos
                    )}%
                  </td>

                  <td>
                    <button
                      type="button"
                      className="reporte-producto-detail-button"
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

            <div className="producto-rank-box">

              <div className="producto-rank-icon">
                <Trophy
                  size={21}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <span>
                  Posición en el ranking
                </span>

                <strong>
                  #{productoSeleccionado.posicion}
                </strong>
              </div>

            </div>

            <div className="reporte-producto-detail-grid">

              <div>
                <span>
                  Unidades vendidas
                </span>

                <strong>
                  <Boxes
                    size={14}
                    strokeWidth={1.9}
                  />

                  {productoSeleccionado.unidades}
                </strong>
              </div>

              <div>
                <span>
                  Valor histórico
                </span>

                <strong>
                  <BadgeDollarSign
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(
                    productoSeleccionado.ingresos
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Participación
                </span>

                <strong>
                  <Percent
                    size={14}
                    strokeWidth={1.9}
                  />

                  {calcularParticipacion(
                    productoSeleccionado.ingresos
                  )}%
                </strong>
              </div>

              <div>
                <span>
                  Valor histórico promedio por unidad
                </span>

                <strong>
                  <BadgeDollarSign
                    size={14}
                    strokeWidth={1.9}
                  />

                  {formatearDinero(
                    productoSeleccionado.promedio
                  )}
                </strong>
              </div>

            </div>

            <div className="reporte-producto-readonly">

              <LockKeyhole
                size={17}
                strokeWidth={1.9}
              />

              <span>
                Este reporte es informativo. La configuración del producto se administra desde el módulo de Inventario.
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

export default ReporteProductosSection;