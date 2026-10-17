import { useHeaderSection } from '../hooks/useHeaderSection';
import { useInventoryResources } from "../hooks/useInventoryResources";
import AjusteStockForm from "../components/AjusteStockForm";
import { listarProductos, crearProducto, actualizarProducto, eliminarProducto as eliminarProductoAPI } from "../services/productosService";
import { listarCategorias } from "../services/categoriasService";
import { listarProveedores } from "../services/proveedoresService";
import { useAuth } from "../context/useAuth";
import { can } from "../utils/permissions";
import Can from "../components/Can";
import { formatCurrency as formatearDinero } from "../utils/formatCurrency";
import { parseCOPInput, formatCOPInput } from "../utils/copInput";
/*
 * Evidencia: GA7-220501096-AA4-EV03
 * Frontend React del módulo de productos e inventario de Donde Juanca.
 *
 * Framework seleccionado: React.
 *
 * Justificación:
 * Se seleccionó React porque permite construir interfaces web dinámicas
 * mediante componentes reutilizables, facilita la gestión del estado de
 * la aplicación y permite consumir servicios REST del backend mediante
 * peticiones HTTP. En este módulo se utiliza React para administrar el
 * inventario de productos del sistema Donde Juanca y mantener sincronizada
 * la información mostrada en pantalla con los datos almacenados en MySQL.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";



import {

  Plus,

  Search,

  Boxes,

  TriangleAlert,

  BadgeDollarSign,

  PackageX,

  ArrowRight,

  X,

  SlidersHorizontal,

  Pencil,

  History,

  Tags,



  Trash2,
} from "lucide-react";



import InventarioNav from "../components/InventarioNav";

import RefrigeradoresSection from "../components/RefrigeradoresSection";

import MovimientosSection from "../components/MovimientosSection";

import AlertasSection from "../components/AlertasSection";

import MermasSection from "../components/MermasSection";



import "./InventarioPage.css";



/**
 * Componente principal del módulo de inventario.
 * Administra la navegación entre secciones, el estado de productos y categorías,
 * los filtros de búsqueda y las operaciones CRUD realizadas desde la interfaz.
 */
function InventarioPage() {
  const { user } = useAuth();
  const inventory = useInventoryResources(user);
  const [ajusteId, setAjusteId] = useState(null);

  const [seccionActiva, setSeccionActiva] = useHeaderSection("resumen", ["resumen","productos","categorias","refrigeradores","movimientos","alertas","mermas"]);

  const [busqueda, setBusqueda] = useState("");

  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);



  // ==========================================

  // PRODUCTOS DESDE BACKEND

  // ==========================================

  const [productos, setProductos] = useState([]);

  const [cargandoProductos, setCargandoProductos] = useState(true);

  const [errorProductos, setErrorProductos] = useState("");

  const [mostrarFormularioProducto, setMostrarFormularioProducto] = useState(false);
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [eliminandoProducto, setEliminandoProducto] = useState(false);
  const [productoEditandoId, setProductoEditandoId] = useState(null);
  const [mensajeProducto, setMensajeProducto] = useState("");
  const [errorFormularioProducto, setErrorFormularioProducto] = useState("");

  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [errorCategorias, setErrorCategorias] = useState("");
  const [cargandoProveedores, setCargandoProveedores] = useState(false);
  const [errorProveedores, setErrorProveedores] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const operacionEnCurso = useRef(false);
  const [formProducto, setFormProducto] = useState({
    nombre: "", codigo: "", precio_venta: "", costo_promedio: 0, cantidad: 0,
    stock_minimo: 0, categorias_id: "", proveedores_id: "", estado: "activo",
  });
  const puedeEscribir = can(user, "productos.editar");

  const cargarProductos = useCallback(async (signal) => {
    try {
      setCargandoProductos(true);
      setErrorProductos("");
      const datos = await listarProductos({ signal });
      if (!signal?.aborted) setProductos(datos);
    } catch (error) {
      if (!signal?.aborted) setErrorProductos(error.status === 403 ? "No tienes permiso para consultar productos." : error.message);
    } finally {
      if (!signal?.aborted) setCargandoProductos(false);
    }
  }, []);

  const refreshStock = async () => {
    await Promise.all([cargarProductos(), inventory.movements.refresh(), inventory.alerts.refresh(), inventory.mermas.refresh()]);
  };

  const cargarCategorias = useCallback(async (signal) => {
    try {
      setCargandoCategorias(true);
      setErrorCategorias("");
      const datos = await listarCategorias({ signal });
      if (!signal?.aborted) setCategorias(datos);
    } catch (error) {
      if (!signal?.aborted) setErrorCategorias(error.status === 403 ? "No tienes permiso para consultar categor\u00edas." : error.message);
    } finally {
      if (!signal?.aborted) setCargandoCategorias(false);
    }
  }, []);

  const cargarProveedores = useCallback(async (signal) => {
    try {
      setCargandoProveedores(true);
      setErrorProveedores("");
      const datos = await listarProveedores({ signal });
      if (!signal?.aborted) setProveedores(datos);
    } catch (error) {
      if (!signal?.aborted) setErrorProveedores(error.message);
    } finally {
      if (!signal?.aborted) setCargandoProveedores(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Iniciar la carga asíncrona; no actualizar estado durante el montaje del efecto.
    Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      cargarProductos(controller.signal);
      cargarCategorias(controller.signal);
      if (puedeEscribir) cargarProveedores(controller.signal);
    });
    return () => controller.abort();
  }, [cargarProductos, cargarCategorias, cargarProveedores, puedeEscribir]);

  const productosConCategoria = useMemo(() => productos.map(producto => ({
    ...producto, categoria: categorias.find(categoria => categoria.id === producto.categorias_id)?.nombre || producto.categoria,
  })), [productos, categorias]);

  const productosFiltrados = useMemo(() => {

    return productosConCategoria.filter((producto) => {

      const coincideEstado =

        filtroEstado === "todos" ||

        producto.estadoStock === filtroEstado;



      const texto = busqueda.toLowerCase();



      const coincideBusqueda =

        producto.nombre.toLowerCase().includes(texto) ||

        producto.codigo.toLowerCase().includes(texto) ||

        producto.categoria.toLowerCase().includes(texto);



      return coincideEstado && coincideBusqueda && (!filtroCategoria || producto.categorias_id === filtroCategoria);

    });

  }, [productosConCategoria, busqueda, filtroEstado, filtroCategoria]);



  // ==========================================

  // FILTROS DE CATEGORÍAS

  // ==========================================

  /*
   * Filtra las categorías según el texto escrito por el usuario,
   * comparándolo con el nombre y la descripción de cada categoría.
   */
  const categoriasFiltradas = useMemo(() => {

    const texto = busqueda.toLowerCase();



    return categorias.filter(

      (categoria) =>

        categoria.nombre.toLowerCase().includes(texto) ||

        categoria.descripcion.toLowerCase().includes(texto)

    );

  }, [busqueda, categorias]);



  // ==========================================

  // KPIs

  // ==========================================

  /*
   * Indicadores generales del inventario calculados a partir
   * de los productos obtenidos desde el backend.
   */
  const totalReferencias = productos.length;



  const stockBajo = productos.filter(

    (producto) =>

      producto.estadoStock === "bajo"

  ).length;



  const agotados = productos.filter(

    (producto) => producto.estadoStock === "agotado"

  ).length;



  const valorInventario = productos.reduce(

    (total, producto) =>

      total + producto.stock * producto.costo,

    0

  );



  // ==========================================

  // UTILIDADES

  // ==========================================

  /**
   * Convierte un valor numérico al formato monetario colombiano (COP)
   * para presentar precios y costos de forma legible en la interfaz.
   */




  /**
   * Traduce el valor interno del estado de stock a un texto comprensible
   * para el usuario dentro de las tablas y paneles del inventario.
   */
  function nombreEstadoStock(estado) {

    if (estado === "normal") return "Normal";

    if (estado === "bajo") return "Stock bajo";


    if (estado === "agotado") return "Agotado";



    return estado;

  }



  /**
   * Prepara y abre el formulario para registrar un nuevo producto.
   * Limpia datos anteriores, restablece valores iniciales y activa
   * la vista del formulario en modo creación.
   */
  function abrirNuevoProducto() {
    setProductoEditandoId(null);
    setMensajeProducto("");
    setErrorFormularioProducto("");

    setFormProducto({
      nombre: "", codigo: "", precio_venta: "", costo_promedio: 0, cantidad: 0,
      stock_minimo: 0, categorias_id: "", proveedores_id: "", estado: "activo",
    });

    setMostrarFormularioProducto(true);
  }

  /**
   * Abre el formulario en modo edición y carga los datos del producto
   * seleccionado para que puedan ser modificados por el usuario.
   */
  function abrirEditarProducto(producto) {
    setProductoSeleccionado(null);
    setProductoEditandoId(producto.id);
    setMensajeProducto("");
    setErrorFormularioProducto("");

    setFormProducto({
      nombre: producto.nombre || "",
      codigo: producto.codigo || "",
      precio_venta: formatCOPInput(producto.precio),
      costo_promedio: producto.costo ?? "",
      cantidad: producto.stock ?? "",
      stock_minimo: producto.minimo ?? "",
      categorias_id: String(producto.categorias_id),
      proveedores_id: producto.proveedores_id,
      estado: producto.activo ? "activo" : "inactivo",
    });

    setMostrarFormularioProducto(true);
  }

  /**
   * Cierra el formulario de productos cuando no hay una operación de guardado
   * en curso y limpia el estado relacionado con la edición y los errores.
   */
  function cerrarFormularioProducto() {
    if (guardandoProducto) return;

    setMostrarFormularioProducto(false);
    setProductoEditandoId(null);
    setErrorFormularioProducto("");
  }

  /**
   * Actualiza dinámicamente el estado del formulario cuando el usuario
   * modifica cualquiera de los campos de un producto.
   */
  function cambiarCampoProducto(event) {
    const { name, value } = event.target;

    setFormProducto((formActual) => ({
      ...formActual,
      [name]: value,
    }));
  }

  /**
   * Guarda la información del formulario mediante una petición HTTP.
   * Si existe un identificador de edición realiza un PUT para actualizar;
   * de lo contrario realiza un POST para crear un nuevo producto.
   * Después de una operación exitosa vuelve a consultar los productos.
   */
  async function guardarProducto(event) {
    event.preventDefault();
    const esEdicion = Boolean(productoEditandoId);
    if (operacionEnCurso.current || !can(user, esEdicion ? "productos.editar" : "productos.crear")) return;
    if (cargandoCategorias || errorCategorias || cargandoProveedores || errorProveedores) return;
    if (!categorias.some(c => c.id === formProducto.categorias_id) || !proveedores.some(p => p.id === formProducto.proveedores_id)) {
      setErrorFormularioProducto("Selecciona relaciones existentes en los cat\u00e1logos actuales."); return;
    }
    operacionEnCurso.current = true;
    setGuardandoProducto(true);
    setErrorFormularioProducto("");
    setMensajeProducto("");
    try {
      // Solo los campos editables del contrato participan en validación y envío.
      const datos = {
        nombre: formProducto.nombre,
        codigo: formProducto.codigo,
        precio_venta: parseCOPInput(formProducto.precio_venta),
        stock_minimo: formProducto.stock_minimo,
        categorias_id: formProducto.categorias_id,
        proveedores_id: formProducto.proveedores_id,
        ...(esEdicion ? { estado: formProducto.estado } : { cantidad: formProducto.cantidad }),
      };
      if (esEdicion) await actualizarProducto(productoEditandoId, datos);
      else await crearProducto(datos);
      setMensajeProducto(esEdicion ? "Producto actualizado correctamente." : "Producto creado correctamente.");
      setMostrarFormularioProducto(false);
      setProductoEditandoId(null);
      await cargarProductos();
    } catch (error) {
      setErrorFormularioProducto(error.status === 403 ? "No tienes permiso para guardar productos." : error.message);
    } finally {
      operacionEnCurso.current = false;
      setGuardandoProducto(false);
    }
  }

  /**
   * Elimina un producto mediante DELETE /api/productos/:id.
   * Antes de enviar la solicitud solicita confirmación al usuario
   * y, si la operación finaliza correctamente, actualiza el listado.
   */
  async function eliminarProducto(producto) {
    if (operacionEnCurso.current || !can(user, "productos.eliminar")) return;
    if (!window.confirm(`\u00bfSeguro que deseas eliminar "${producto.nombre}"? Esta acci\u00f3n no se puede deshacer.`)) return;
    operacionEnCurso.current = true;
    setEliminandoProducto(true);
    setMensajeProducto("");
    try {
      await eliminarProductoAPI(producto.id);
      setProductoSeleccionado(null);
      setMensajeProducto("Producto eliminado correctamente.");
      await cargarProductos();
    } catch (error) {
      setErrorProductos(error.status === 403 ? "No tienes permiso para eliminar productos." : error.message);
    } finally {
      operacionEnCurso.current = false;
      setEliminandoProducto(false);
    }
  }

  /**
   * Cierra el panel lateral que muestra la información detallada
   * del producto seleccionado.
   */
  function cerrarDetalleProducto() {

    setProductoSeleccionado(null);

  }



  /**
   * Cierra el panel lateral que muestra la información detallada
   * de la categoría seleccionada.
   */
  function cerrarDetalleCategoria() {

    setCategoriaSeleccionada(null);

  }



  /**
   * Las categorías se consultan desde la API y su detalle se presenta en un panel lateral.
   */

  /**
   * Devuelve la descripción correspondiente a la sección activa
   * para orientar al usuario dentro del módulo de inventario.
   */
  function descripcionSeccion() {

    if (seccionActiva === "resumen") {

      return "Consulta existencias, alertas y valor estimado del inventario.";

    }



    if (seccionActiva === "productos") {

      return "Administra los productos registrados en Donde Juanca.";

    }



    if (seccionActiva === "categorias") {

      return "Administra las categorías utilizadas para organizar los productos.";

    }



    if (seccionActiva === "refrigeradores") {

      return "Consulta y controla los equipos de refrigeración.";

    }



    if (seccionActiva === "movimientos") {

      return "Consulta entradas, salidas y ajustes de inventario.";

    }



    if (seccionActiva === "alertas") {

      return "Revisa productos y existencias que requieren atención.";

    }



    if (seccionActiva === "mermas") {

      return "Registra y consulta pérdidas o desperdicios de inventario.";

    }



    return "";

  }



  return (

    <div className="inventario-page">

      {/* =========================

          ENCABEZADO

      ========================= */}



      <header className="inventario-header">

        <div>

          <p className="page-eyebrow">INVENTARIO</p>



          <h1 className="page-title">

            {seccionActiva === "resumen" && "Resumen"}

            {seccionActiva === "productos" && "Productos"}

            {seccionActiva === "categorias" && "Categorías"}

            {seccionActiva === "refrigeradores" && "Refrigeradores"}

            {seccionActiva === "movimientos" && "Movimientos"}

            {seccionActiva === "alertas" && "Alertas"}

            {seccionActiva === "mermas" && "Mermas"}

          </h1>



          <p className="page-description">

            {descripcionSeccion()}

          </p>

        </div>



        {seccionActiva === "productos" && (

          <Can permission="productos.crear"><button

            type="button"

            className="primary-button inventario-primary-action"
            onClick={abrirNuevoProducto}

          >

            <Plus size={18} strokeWidth={1.9} />

            Nuevo producto

          </button></Can>

        )}





      </header>



      {/* =========================

          NAVEGACIÓN

      ========================= */}



      <InventarioNav

        seccionActiva={seccionActiva}

        onCambiarSeccion={(seccion) => {

          setSeccionActiva(seccion);

          setBusqueda("");

          setFiltroEstado("todos");
          setFiltroCategoria("");

        }}

      />



      {(seccionActiva === "resumen" || seccionActiva === "productos" || seccionActiva === "categorias") && (
        <>
          {cargandoCategorias && <p role="status">Cargando categorías...</p>}
          {errorCategorias && <div role="alert"><p>{errorCategorias}</p><button className="text-button" onClick={() => cargarCategorias()}>Reintentar categorías</button></div>}
          {!cargandoCategorias && !errorCategorias && categorias.length === 0 && <p>No hay categorías registradas.</p>}
          {seccionActiva !== "categorias" && (
            <label>Categoría
              <select value={filtroCategoria} onChange={event => setFiltroCategoria(event.target.value)} disabled={cargandoCategorias || Boolean(errorCategorias)}>
                <option value="">Todas las categorías</option>
                {categorias.map(categoria => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
              </select>
            </label>
          )}
        </>
      )}

      {/* =========================

          RESUMEN

      ========================= */}



      {seccionActiva === "resumen" && (

        <>

          <section className="inventario-kpis">

            <button

              type="button"

              className={`inventario-kpi ${

                filtroEstado === "todos"

                  ? "selected"

                  : ""

              }`}

              onClick={() => setFiltroEstado("todos")}

            >

              <div className="inventario-kpi-icon references">

                <Boxes size={20} strokeWidth={1.9} />

              </div>



              <span>Referencias</span>

              <strong>{totalReferencias}</strong>

              <small>Productos registrados</small>

            </button>



            <button

              type="button"

              className={`inventario-kpi ${

                filtroEstado === "bajo"

                  ? "selected"

                  : ""

              }`}

              onClick={() => setFiltroEstado("bajo")}

            >

              <div className="inventario-kpi-icon warning">

                <TriangleAlert size={20} strokeWidth={1.9} />

              </div>



              <span>Con stock bajo</span>

              <strong>{stockBajo}</strong>

              <small className="inventario-warning">

                Requieren reposición

              </small>

            </button>



            <article className="inventario-kpi">

              <div className="inventario-kpi-icon value">

                <BadgeDollarSign size={20} strokeWidth={1.9} />

              </div>



              <span>Valor estimado</span>

              <strong>

                {formatearDinero(valorInventario)}

              </strong>

              <small>Según costo registrado</small>

            </article>



            <button

              type="button"

              className={`inventario-kpi alert ${

                filtroEstado === "agotado"

                  ? "selected"

                  : ""

              }`}

              onClick={() => setFiltroEstado("agotado")}

            >

              <div className="inventario-kpi-icon danger">

                <PackageX size={20} strokeWidth={1.9} />

              </div>



              <span>Agotados</span>

              <strong>{agotados}</strong>

              <small>Sin existencias</small>

            </button>

          </section>



          <section className="inventario-toolbar">

            <div className="inventario-filters">

              <button

                type="button"

                className={`filter-button ${

                  filtroEstado === "todos"

                    ? "active"

                    : ""

                }`}

                onClick={() => setFiltroEstado("todos")}

              >

                Todos

              </button>



              <button

                type="button"

                className={`filter-button ${

                  filtroEstado === "normal"

                    ? "active"

                    : ""

                }`}

                onClick={() => setFiltroEstado("normal")}

              >

                Normal

              </button>



              <button

                type="button"

                className={`filter-button ${

                  filtroEstado === "bajo"

                    ? "active"

                    : ""

                }`}

                onClick={() => setFiltroEstado("bajo")}

              >

                Stock bajo

              </button>







              <button

                type="button"

                className={`filter-button ${

                  filtroEstado === "agotado"

                    ? "active"

                    : ""

                }`}

                onClick={() => setFiltroEstado("agotado")}

              >

                Agotados

              </button>

            </div>



            <div className="inventario-search">

              <Search

                className="inventario-search-icon"

                size={18}

                strokeWidth={1.9}

              />



              <input

                type="text"

                placeholder="Buscar producto, código o categoría..."

                value={busqueda}

                onChange={(event) =>

                  setBusqueda(event.target.value)

                }

              />

            </div>

          </section>

        </>

      )}



      {/* =========================

          PRODUCTOS

      ========================= */}



      {seccionActiva === "productos" && (

        <section className="inventario-toolbar">

          <div className="inventario-filters">

            <button

              type="button"

              className={`filter-button ${

                filtroEstado === "todos"

                  ? "active"

                  : ""

              }`}

              onClick={() => setFiltroEstado("todos")}

            >

              Todos

            </button>



            <button

              type="button"

              className={`filter-button ${

                filtroEstado === "normal"

                  ? "active"

                  : ""

              }`}

              onClick={() => setFiltroEstado("normal")}

            >

              Normal

            </button>



            <button

              type="button"

              className={`filter-button ${

                filtroEstado === "bajo"

                  ? "active"

                  : ""

              }`}

              onClick={() => setFiltroEstado("bajo")}

            >

              Stock bajo

            </button>



            <button

              type="button"

              className={`filter-button ${

                filtroEstado === "agotado"

                  ? "active"

                  : ""

              }`}

              onClick={() => setFiltroEstado("agotado")}

            >

              Agotados

            </button>

          </div>



          <div className="inventario-search">

            <Search

              className="inventario-search-icon"

              size={18}

              strokeWidth={1.9}

            />



            <input

              type="text"

              placeholder="Buscar producto..."

              value={busqueda}

              onChange={(event) =>

                setBusqueda(event.target.value)

              }

            />

          </div>

        </section>

      )}



            {mensajeProducto && (
        <section
          className="inventario-empty-section"
          style={{
            minHeight: "auto",
            padding: "16px",
            marginBottom: "18px",
          }}
        >
          <p
            style={{
              color: "var(--color-success)",
              fontWeight: 700,
            }}
          >
            {mensajeProducto}
          </p>
        </section>
      )}

{/* =========================

          ESTADO DE CARGA

      ========================= */}



      {(seccionActiva === "resumen" ||

        seccionActiva === "productos") &&

        cargandoProductos && (

          <section className="inventario-empty-section">

            <h2>Cargando productos...</h2>

            <p>

              Consultando información desde la base de datos.

            </p>

          </section>

        )}



      {(seccionActiva === "resumen" ||

        seccionActiva === "productos") &&

        !cargandoProductos &&

        errorProductos && (

          <section className="inventario-empty-section">

            <h2>No se pudieron cargar los productos</h2>

            <p>{errorProductos}</p>
            <button className="text-button" onClick={() => cargarProductos()}>Reintentar productos</button>

          </section>

        )}



      {/* =========================

          TABLA PRODUCTOS

      ========================= */}



      {(seccionActiva === "resumen" ||

        seccionActiva === "productos") &&

        !cargandoProductos &&

        !errorProductos && (

          <section className="inventario-panel">

            <div className="inventario-panel-header">

              <div>

                <h2>

                  {seccionActiva === "resumen"

                    ? "Existencias"

                    : "Productos"}

                </h2>



                <p>

                  {productosFiltrados.length} productos encontrados

                </p>

              </div>

            </div>



            <div className="inventario-table-wrapper">

              <table className="inventario-table">

                <thead>

                  <tr>

                    <th>Código</th>

                    <th>Producto</th>

                    <th>Categoría</th>

                    <th>Precio</th>

                    <th>Costo</th>

                    <th>Stock</th>

                    <th>Estado producto</th>

                    <th>Estado stock</th>

                    <th></th>

                  </tr>

                </thead>



                <tbody>

                  {productosFiltrados.map((producto) => (

                    <tr

                      key={producto.id}

                      className={

                        producto.estadoStock === "agotado" ||

                        producto.estadoStock === "bajo"

                          ? "inventario-row attention"

                          : "inventario-row"

                      }

                    >

                      <td>

                        <span className="producto-code">

                          {producto.codigo}

                        </span>

                      </td>



                      <td>

                        <strong>{producto.nombre}</strong>

                      </td>



                      <td>{producto.categoria}</td>



                      <td>

                        {formatearDinero(producto.precio)}

                      </td>



                      <td>

                        {formatearDinero(producto.costo)}

                      </td>



                      <td>

                        <strong className="producto-stock-value">

                          {producto.stock}

                        </strong>

                      </td>



                      <td>

                        <span

                          className={`producto-active-status ${

                            producto.activo

                              ? "activo"

                              : "inactivo"

                          }`}

                        >

                          {producto.activo

                            ? "Activo"

                            : "Inactivo"}

                        </span>

                      </td>



                      <td>

                        <span

                          className={`inventario-status ${producto.estadoStock}`}

                        >

                          {nombreEstadoStock(

                            producto.estadoStock

                          )}

                        </span>

                      </td>



                      <td>

                        <button

                          type="button"

                          className="inventario-detail-button"

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



                  {productosFiltrados.length === 0 && (

                    <tr>

                      <td colSpan="9">

                        No hay productos para mostrar.

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </section>

        )}



      {/* =========================

          CATEGORÍAS

      ========================= */}



      {seccionActiva === "categorias" && !cargandoCategorias && !errorCategorias && (

        <>

          <section className="inventario-toolbar">

            <div className="categorias-summary">

              <span>

                {

                  categorias.filter(

                    (categoria) => categoria.activo

                  ).length

                }{" "}

                activas

              </span>



              <span>

                {

                  categorias.filter(

                    (categoria) => !categoria.activo

                  ).length

                }{" "}

                inactivas

              </span>

            </div>



            <div className="inventario-search">

              <Search

                className="inventario-search-icon"

                size={18}

                strokeWidth={1.9}

              />



              <input

                type="text"

                placeholder="Buscar categoría..."

                value={busqueda}

                onChange={(event) =>

                  setBusqueda(event.target.value)

                }

              />

            </div>

          </section>



          <section className="categorias-grid">
            {categoriasFiltradas.length === 0 && <p>No hay categorías para mostrar.</p>}

            {categoriasFiltradas.map((categoria) => (

              <article

                key={categoria.id}

                className="categoria-card"

              >

                <div className="categoria-card-icon">

                  <Tags

                    size={19}

                    strokeWidth={1.9}

                  />

                </div>



                <div className="categoria-card-header">

                  <div>

                    <h3>{categoria.nombre}</h3>



                    <span

                      className={`categoria-status ${

                        categoria.activo

                          ? "activa"

                          : "inactiva"

                      }`}

                    >

                      {categoria.activo

                        ? "Activa"

                        : "Inactiva"}

                    </span>

                  </div>

                </div>



                <p>{categoria.descripcion}</p>



                <div className="categoria-card-footer">

                  <button

                    type="button"

                    className="categoria-detail-button"

                    onClick={() =>

                      setCategoriaSeleccionada(categoria)

                    }

                  >

                    Ver detalle



                    <ArrowRight

                      size={15}

                      strokeWidth={1.9}

                    />

                  </button>





                </div>

              </article>

            ))}

          </section>

        </>

      )}



      {/* =========================

          SUBSECCIONES

      ========================= */}



      {seccionActiva === "refrigeradores" && can(user, "inventario.movimientos") && (

        <RefrigeradoresSection onChanged={inventory.fridges.refresh} />

      )}



      {seccionActiva === "movimientos" && can(user, "inventario.movimientos") && (

        <MovimientosSection resource={inventory.movements} productos={productos} />

      )}



      {seccionActiva === "alertas" && can(user, "alertas.ver") && (

        <AlertasSection resource={inventory.alerts} productos={productos} />

      )}



      {seccionActiva === "mermas" && can(user, "mermas.ver") && (

        <MermasSection resource={inventory.mermas} motivos={inventory.motives} refrigeradores={inventory.fridges} productos={productos} productosLoading={cargandoProductos} productosError={errorProductos} onReloadProducts={() => cargarProductos()} onStockChanged={refreshStock} />

      )}



            {/* =========================
          FORMULARIO DE CREACIÓN Y EDICIÓN DE PRODUCTO
      ========================= */}

      {mostrarFormularioProducto && puedeEscribir && (
        <>
          <div
            className="inventario-overlay"
            onClick={cerrarFormularioProducto}
          ></div>

          <aside className="inventario-drawer">
            <div className="inventario-drawer-header">
              <div>
                <p className="page-eyebrow">
                  {productoEditandoId
                    ? "EDITAR PRODUCTO"
                    : "NUEVO PRODUCTO"}
                </p>

                <h2>
                  {productoEditandoId
                    ? "Actualizar producto"
                    : "Registrar producto"}
                </h2>

                <span>
                  {productoEditandoId
                    ? "Actualiza la información del producto."
                    : "Completa la información del producto para agregarlo al inventario."}
                </span>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={cerrarFormularioProducto}
                aria-label="Cerrar formulario"
              >
                <X size={20} strokeWidth={1.9} />
              </button>
            </div>

            {errorCategorias && <p role="alert">{errorCategorias}</p>}
            {cargandoProveedores && <p role="status">Cargando proveedores...</p>}
            {errorProveedores && <div role="alert"><p>{errorProveedores}</p><button className="text-button" onClick={() => cargarProveedores()}>Reintentar proveedores</button></div>}
            {!cargandoProveedores && !errorProveedores && proveedores.length === 0 && <p>No hay proveedores disponibles.</p>}

            <form
              onSubmit={guardarProducto}
              style={{
                display: "grid",
                gap: "14px",
                marginTop: "22px",
              }}
            >
              <fieldset disabled={guardandoProducto} style={{ display: "contents", border: 0, padding: 0, margin: 0 }}>
              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>
                  Nombre
                </span>

                <input
                  type="text"
                  name="nombre"
                  value={formProducto.nombre}
                  onChange={cambiarCampoProducto}
                  placeholder="Ej. Cerveza Águila 330ml"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    font: "inherit",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>
                  Código
                </span>

                <input
                  type="text"
                  name="codigo"
                  value={formProducto.codigo}
                  onChange={cambiarCampoProducto}
                  placeholder="Ej. CERV-002"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    font: "inherit",
                  }}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    Precio de venta
                  </span>

                  <input
                    type="text"
                    name="precio_venta"
                    inputMode="decimal"
                    aria-describedby="precio-venta-ayuda"
                    value={formProducto.precio_venta}
                    onChange={cambiarCampoProducto}
                    required
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      font: "inherit",
                    }}
                  />
                  <small id="precio-venta-ayuda">Usa puntos para miles y coma para decimales. Ejemplo: 2.844,44.</small>
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    Costo promedio
                  </span>

                  <input
                    type="number"
                    name="costo_promedio"
                    readOnly
                    step="0.01"
                    min="0"
                    value={formProducto.costo_promedio}
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      font: "inherit",
                    }}
                  />
                  <small>Se calcula automáticamente según las compras y recepciones.</small>
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    {productoEditandoId ? "Stock actual" : "Cantidad inicial"}
                  </span>

                  <input
                    type="number"
                    name="cantidad"
                    readOnly={Boolean(productoEditandoId)}
                    min="0"
                    value={formProducto.cantidad}
                    onChange={cambiarCampoProducto}
                    required
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      font: "inherit",
                    }}
                  />
                  {productoEditandoId && <small>Para cambiar las unidades disponibles, utiliza el ajuste de inventario.</small>}
                </label>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    Stock mínimo
                  </span>

                  <input
                    type="number"
                    name="stock_minimo"
                    min="0"
                    value={formProducto.stock_minimo}
                    onChange={cambiarCampoProducto}
                    required
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      font: "inherit",
                    }}
                  />
                </label>
              </div>

              <label style={{ display: "grid", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>
                  Categoría
                </span>

                <select
                  name="categorias_id"
                  disabled={cargandoCategorias || Boolean(errorCategorias)}
                  value={formProducto.categorias_id}
                  onChange={cambiarCampoProducto}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    background: "white",
                    font: "inherit",
                  }}
                >
                  <option value="">Selecciona una categor&#237;a</option>
                  {categorias.map(categoria => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                </select>
              </label>

              <label style={{ display: "grid", gap: "6px" }}>
                Proveedor
                <select name="proveedores_id" value={formProducto.proveedores_id} onChange={cambiarCampoProducto} required disabled={cargandoProveedores || Boolean(errorProveedores)} style={{ width: "100%", padding: "11px 12px", border: "1px solid var(--color-border)", borderRadius: "10px", background: "white", font: "inherit" }}>
                  <option value="">Selecciona un proveedor</option>
                  {proveedores.map(proveedor => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}{proveedor.estado === "inactivo" ? " (inactivo)" : ""}</option>)}
                </select>
              </label>

              {productoEditandoId && (
                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    Estado del producto
                  </span>

                  <select
                    name="estado"
                    value={formProducto.estado}
                    onChange={cambiarCampoProducto}
                    required
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "10px",
                      background: "white",
                      font: "inherit",
                    }}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </label>
              )}

              {errorFormularioProducto && (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background: "var(--color-danger-bg)",
                    color: "var(--color-danger)",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {errorFormularioProducto}
                </div>
              )}

              <div className="inventario-drawer-actions">
                <button
                  type="submit"
                  className="drawer-primary-button"
                  disabled={guardandoProducto || cargandoCategorias || Boolean(errorCategorias) || cargandoProveedores || Boolean(errorProveedores)}
                >
                  <Plus size={17} strokeWidth={1.9} />

                  {guardandoProducto
                    ? "Guardando..."
                    : productoEditandoId
                      ? "Actualizar producto"
                      : "Guardar producto"}
                </button>

                <button
                  type="button"
                  className="drawer-secondary-button"
                  onClick={cerrarFormularioProducto}
                  disabled={guardandoProducto}
                >
                  Cancelar
                </button>
              </div>
              </fieldset>
            </form>
          </aside>
        </>
      )}

{/* =========================

          DRAWER PRODUCTO

      ========================= */}



      {productoSeleccionado && (

        <>

          <div

            className="inventario-overlay"

            onClick={cerrarDetalleProducto}

          ></div>



          <aside className="inventario-drawer">

            <div className="inventario-drawer-header">

              <div>

                <p className="page-eyebrow">

                  DETALLE DEL PRODUCTO

                </p>



                <h2>

                  {productoSeleccionado.nombre}

                </h2>



                <span>

                  {productoSeleccionado.codigo}

                </span>

              </div>



              <button

                type="button"

                className="drawer-close"

                onClick={cerrarDetalleProducto}

                aria-label="Cerrar detalle"

              >

                <X

                  size={20}

                  strokeWidth={1.9}

                />

              </button>

            </div>



            <div

              className={`inventario-drawer-status ${

                productoSeleccionado.activo

                  ? "activo"

                  : "inactivo"

              }`}

            >

              <span>Estado del producto</span>



              <strong>

                {productoSeleccionado.activo

                  ? "Activo"

                  : "Inactivo"}

              </strong>

            </div>



            <div className="inventario-detail-grid">

              <div>

                <span>Categoría</span>

                <strong>

                  {productoSeleccionado.categoria}

                </strong>

              </div>



              <div>

                <span>Stock actual</span>

                <strong>

                  {productoSeleccionado.stock}

                </strong>

              </div>



              <div>

                <span>Stock mínimo</span>

                <strong>

                  {productoSeleccionado.minimo}

                </strong>

              </div>



              <div>

                <span>Costo unitario</span>

                <strong>

                  {formatearDinero(

                    productoSeleccionado.costo

                  )}

                </strong>

              </div>



              <div>

                <span>Precio de venta</span>

                <strong>

                  {formatearDinero(

                    productoSeleccionado.precio

                  )}

                </strong>

              </div>



              <div>

                <span>Estado de stock</span>

                <strong>

                  {nombreEstadoStock(

                    productoSeleccionado.estadoStock

                  )}

                </strong>

              </div>

            </div>



            {errorProductos && <p role="alert">{errorProductos}</p>}

            <div className="inventario-drawer-actions">

              <Can permission="inventario.ajustar"><button onClick={() => { setAjusteId(productoSeleccionado.id); setProductoSeleccionado(null); }}

                type="button"

                className="drawer-primary-button"

              >

                <SlidersHorizontal

                  size={17}

                  strokeWidth={1.9}

                />



                Ajustar stock

              </button></Can>



              <Can permission="productos.editar"><button
                type="button"
                className="drawer-secondary-button"
                onClick={() =>
                  abrirEditarProducto(productoSeleccionado)
                }
              >
                <Pencil
                  size={17}
                  strokeWidth={1.9}
                />

                Editar producto
              </button></Can>

              <Can permission="productos.eliminar"><button
                type="button"
                className="drawer-secondary-button"
                onClick={() =>
                  eliminarProducto(productoSeleccionado)
                }
                disabled={eliminandoProducto}
                style={{
                  color: "var(--color-danger)",
                }}
              >
                <Trash2
                  size={17}
                  strokeWidth={1.9}
                />

                {eliminandoProducto
                  ? "Eliminando..."
                  : "Eliminar producto"}
              </button></Can>



              <Can permission="inventario.movimientos"><button onClick={() => { inventory.movements.setQuery({ pagina: 1, producto_id: productoSeleccionado.id }); setSeccionActiva("movimientos"); setProductoSeleccionado(null); }}

                type="button"

                className="drawer-secondary-button"

              >

                <History

                  size={17}

                  strokeWidth={1.9}

                />



                Ver movimientos

              </button></Can>

            </div>

          </aside>

        </>

      )}



      {/* =========================

          DRAWER CATEGORÍA

      ========================= */}



      {categoriaSeleccionada && (

        <>

          <div

            className="inventario-overlay"

            onClick={cerrarDetalleCategoria}

          ></div>



          <aside className="inventario-drawer">

            <div className="inventario-drawer-header">

              <div>

                <p className="page-eyebrow">

                  DETALLE DE CATEGORÍA

                </p>



                <h2>

                  {categoriaSeleccionada.nombre}

                </h2>

              </div>



              <button

                type="button"

                className="drawer-close"

                onClick={cerrarDetalleCategoria}

                aria-label="Cerrar detalle"

              >

                <X

                  size={20}

                  strokeWidth={1.9}

                />

              </button>

            </div>



            <div

              className={`inventario-drawer-status ${

                categoriaSeleccionada.activo

                  ? "activo"

                  : "inactivo"

              }`}

            >

              <span>Estado</span>



              <strong>

                {categoriaSeleccionada.activo

                  ? "Activa"

                  : "Inactiva"}

              </strong>

            </div>



            <div className="categoria-drawer-description">

              <span>Descripción</span>



              <p>

                {categoriaSeleccionada.descripcion}

              </p>

            </div>



            <div className="categoria-drawer-info">

              <span>Productos asociados</span>



              <strong>

                {

                  productos.filter(

                    (producto) =>

                      producto.categorias_id === categoriaSeleccionada.id

                  ).length

                }

              </strong>

            </div>



            <div className="inventario-drawer-actions">







            </div>

          </aside>

        </>

      )}

      {ajusteId && can(user, "inventario.ajustar") && <AjusteStockForm productos={productos} initialId={ajusteId} onRefresh={refreshStock} onClose={() => setAjusteId(null)} onSaved={response => { setMensajeProducto(response.mensaje); setAjusteId(null); }} />}

    </div>

  );

}



export default InventarioPage;
