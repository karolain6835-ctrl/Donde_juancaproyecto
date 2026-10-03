import { useMemo, useState } from "react";

import {
  Search,
  Plus,
  Trash2,
  Package,
  UserRound,
  CalendarDays,
  Clock3,
  ArrowRight,
  X,
  TriangleAlert,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

import "./MermasSection.css";

function MermasSection() {
  const [busqueda, setBusqueda] = useState("");
  const [mermaSeleccionada, setMermaSeleccionada] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [mermas, setMermas] = useState([
    {
      id: 1,
      referencia: "MER-042",
      producto: "Papas a la francesa",
      codigo: "COM-001",
      cantidad: 3,
      motivo: "Producto deteriorado",
      usuario: "Carlos",
      fecha: "01/10/2026",
      hora: "21:18",
      observacion: "Producto descartado durante cierre de cocina.",
    },
    {
      id: 2,
      referencia: "MER-043",
      producto: "Poker 330ml",
      codigo: "BEB-001",
      cantidad: 2,
      motivo: "Envase roto",
      usuario: "Laura",
      fecha: "02/10/2026",
      hora: "09:12",
      observacion: "Dos unidades dañadas durante almacenamiento.",
    },
    {
      id: 3,
      referencia: "MER-044",
      producto: "Coca-Cola 400ml",
      codigo: "GAS-001",
      cantidad: 1,
      motivo: "Vencimiento",
      usuario: "Karol",
      fecha: "02/10/2026",
      hora: "11:03",
      observacion: "Unidad retirada durante revisión de inventario.",
    },
  ]);

  const [productos, setProductos] = useState([
    {
      id: 1,
      codigo: "BEB-001",
      nombre: "Poker 330ml",
      stock: 12,
    },
    {
      id: 2,
      codigo: "LIC-001",
      nombre: "Aguardiente Antioqueño",
      stock: 3,
    },
    {
      id: 3,
      codigo: "LIC-002",
      nombre: "Ron Medellín 750ml",
      stock: 5,
    },
    {
      id: 4,
      codigo: "BEB-002",
      nombre: "Club Colombia",
      stock: 38,
    },
    {
      id: 5,
      codigo: "GAS-001",
      nombre: "Coca-Cola 400ml",
      stock: 42,
    },
    {
      id: 6,
      codigo: "COM-001",
      nombre: "Papas a la francesa",
      stock: 8,
    },
  ]);

  const [formulario, setFormulario] = useState({
    productoId: "",
    cantidad: "",
    motivo: "",
    observacion: "",
  });

  const mermasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase();

    return mermas.filter(
      (merma) =>
        merma.producto.toLowerCase().includes(texto) ||
        merma.codigo.toLowerCase().includes(texto) ||
        merma.referencia.toLowerCase().includes(texto) ||
        merma.motivo.toLowerCase().includes(texto)
    );
  }, [mermas, busqueda]);

  function registrarMerma(event) {
    event.preventDefault();

    const producto = productos.find(
      (item) =>
        item.id === Number(formulario.productoId)
    );

    const cantidad = Number(formulario.cantidad);

    if (!producto || cantidad <= 0) {
      return;
    }

    if (cantidad > producto.stock) {
      return;
    }

    const nuevaMerma = {
      id: Date.now(),
      referencia: `MER-${45 + mermas.length}`,
      producto: producto.nombre,
      codigo: producto.codigo,
      cantidad,
      motivo: formulario.motivo,
      usuario: "Karol",
      fecha: "02/10/2026",
      hora: "16:30",
      observacion:
        formulario.observacion ||
        "Sin observación adicional.",
    };

    setMermas((actuales) => [
      nuevaMerma,
      ...actuales,
    ]);

    setProductos((actuales) =>
      actuales.map((item) =>
        item.id === producto.id
          ? {
              ...item,
              stock: item.stock - cantidad,
            }
          : item
      )
    );

    setFormulario({
      productoId: "",
      cantidad: "",
      motivo: "",
      observacion: "",
    });

    setMostrarFormulario(false);
  }

  return (
    <div className="mermas-section">

      {/* =========================
          CABECERA Y ACCIONES
      ========================= */}

      <section className="mermas-toolbar">

        <div>
          <h2>
            Historial de mermas
          </h2>

          <p>
            Registra y consulta pérdidas que afectan el inventario.
          </p>
        </div>

        <div className="mermas-toolbar-actions">

          <div className="mermas-search">

            <Search
              className="mermas-search-icon"
              size={18}
              strokeWidth={1.9}
            />

            <input
              type="text"
              placeholder="Buscar merma..."
              value={busqueda}
              onChange={(event) =>
                setBusqueda(event.target.value)
              }
            />

          </div>

          <button
            type="button"
            className="primary-button mermas-new-button"
            onClick={() =>
              setMostrarFormulario(true)
            }
          >
            <Plus
              size={17}
              strokeWidth={1.9}
            />

            Registrar merma
          </button>

        </div>

      </section>

      {/* =========================
          PANEL
      ========================= */}

      <section className="mermas-panel">

        <div className="mermas-panel-header">

          <span>
            {mermasFiltradas.length} registros encontrados
          </span>

          <small>
            <ClipboardList
              size={13}
              strokeWidth={1.9}
            />

            Historial de trazabilidad
          </small>

        </div>

        <div className="mermas-table-wrapper">

          <table className="mermas-table">

            <thead>
              <tr>
                <th>Referencia</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Motivo</th>
                <th>Usuario</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {mermasFiltradas.map((merma) => (

                <tr key={merma.id}>

                  <td>
                    <span className="merma-reference">
                      {merma.referencia}
                    </span>
                  </td>

                  <td>
                    <div className="merma-product">

                      <strong>
                        {merma.producto}
                      </strong>

                      <span>
                        {merma.codigo}
                      </span>

                    </div>
                  </td>

                  <td>
                    <strong className="merma-quantity">
                      -{merma.cantidad}
                    </strong>
                  </td>

                  <td>
                    {merma.motivo}
                  </td>

                  <td>
                    {merma.usuario}
                  </td>

                  <td>
                    {merma.fecha}
                  </td>

                  <td>
                    {merma.hora}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="merma-detail-button"
                      onClick={() =>
                        setMermaSeleccionada(merma)
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

      {/* =========================
          FORMULARIO NUEVA MERMA
      ========================= */}

      {mostrarFormulario && (
        <>

          <div
            className="merma-overlay"
            onClick={() =>
              setMostrarFormulario(false)
            }
          ></div>

          <aside className="merma-drawer">

            <div className="merma-drawer-header">

              <div>
                <p className="page-eyebrow">
                  NUEVA MERMA
                </p>

                <h2>
                  Registrar merma
                </h2>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setMostrarFormulario(false)
                }
                aria-label="Cerrar formulario"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <form
              className="merma-form"
              onSubmit={registrarMerma}
            >

              <label>
                Producto

                <select
                  value={formulario.productoId}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      productoId: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">
                    Selecciona un producto
                  </option>

                  {productos.map((producto) => (
                    <option
                      key={producto.id}
                      value={producto.id}
                    >
                      {producto.nombre} · Stock {producto.stock}
                    </option>
                  ))}

                </select>
              </label>

              <label>
                Cantidad

                <input
                  type="number"
                  min="1"
                  value={formulario.cantidad}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      cantidad: event.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                Motivo

                <select
                  value={formulario.motivo}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      motivo: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">
                    Selecciona un motivo
                  </option>

                  <option value="Producto deteriorado">
                    Producto deteriorado
                  </option>

                  <option value="Envase roto">
                    Envase roto
                  </option>

                  <option value="Vencimiento">
                    Vencimiento
                  </option>

                  <option value="Error operativo">
                    Error operativo
                  </option>

                  <option value="Otro">
                    Otro
                  </option>

                </select>
              </label>

              <label>
                Observación

                <textarea
                  rows="4"
                  placeholder="Describe lo ocurrido..."
                  value={formulario.observacion}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      observacion: event.target.value,
                    })
                  }
                ></textarea>
              </label>

              <div className="merma-form-warning">

                <TriangleAlert
                  size={16}
                  strokeWidth={1.9}
                />

                <span>
                  Al registrar la merma, la cantidad será descontada del stock
                  del producto.
                </span>

              </div>

              <button
                type="submit"
                className="drawer-primary-button"
              >
                <Trash2
                  size={17}
                  strokeWidth={1.9}
                />

                Registrar merma
              </button>

            </form>

          </aside>

        </>
      )}

      {/* =========================
          DETALLE
      ========================= */}

      {mermaSeleccionada && (
        <>

          <div
            className="merma-overlay"
            onClick={() =>
              setMermaSeleccionada(null)
            }
          ></div>

          <aside className="merma-drawer">

            <div className="merma-drawer-header">

              <div>
                <p className="page-eyebrow">
                  DETALLE DE MERMA
                </p>

                <h2>
                  {mermaSeleccionada.referencia}
                </h2>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={() =>
                  setMermaSeleccionada(null)
                }
                aria-label="Cerrar detalle"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div className="merma-detail-grid">

              <div>
                <span>
                  Producto
                </span>

                <strong>
                  <Package
                    size={14}
                    strokeWidth={1.9}
                  />

                  {mermaSeleccionada.producto}
                </strong>
              </div>

              <div>
                <span>
                  Código
                </span>

                <strong>
                  {mermaSeleccionada.codigo}
                </strong>
              </div>

              <div>
                <span>
                  Cantidad descontada
                </span>

                <strong className="merma-quantity">
                  -{mermaSeleccionada.cantidad}
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

                  {mermaSeleccionada.usuario}
                </strong>
              </div>

              <div>
                <span>
                  Fecha
                </span>

                <strong>
                  <CalendarDays
                    size={14}
                    strokeWidth={1.9}
                  />

                  {mermaSeleccionada.fecha}
                </strong>
              </div>

              <div>
                <span>
                  Hora
                </span>

                <strong>
                  <Clock3
                    size={14}
                    strokeWidth={1.9}
                  />

                  {mermaSeleccionada.hora}
                </strong>
              </div>

            </div>

            <div className="merma-detail-block">

              <span>
                Motivo
              </span>

              <strong>
                {mermaSeleccionada.motivo}
              </strong>

            </div>

            <div className="merma-detail-block">

              <span>
                Observación
              </span>

              <p>
                {mermaSeleccionada.observacion}
              </p>

            </div>

            <div className="merma-history-notice">

              <ShieldCheck
                size={16}
                strokeWidth={1.9}
              />

              <span>
                Este registro forma parte de la trazabilidad del inventario y no
                puede eliminarse directamente.
              </span>

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

export default MermasSection;