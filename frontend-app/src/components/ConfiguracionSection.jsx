import { useState } from "react";
import "./ConfiguracionSection.css";

function ConfiguracionSection() {
  const [configuracion, setConfiguracion] = useState({
    nombreNegocio: "Donde Juanca",
    nit: "900123456-7",
    telefono: "300 555 1234",
    email: "contacto@dondejuanca.com",
    direccion: "Medellín, Antioquia",
    horaApertura: "10:00",
    horaCierre: "02:00",
    impuesto: "19",
    moneda: "COP",
  });

  const [guardado, setGuardado] = useState(false);
  const [confirmarCambios, setConfirmarCambios] = useState(false);

  function actualizarCampo(campo, valor) {
    setConfiguracion((actual) => ({
      ...actual,
      [campo]: valor,
    }));

    setGuardado(false);
  }

  function solicitarGuardado() {
    setConfirmarCambios(true);
  }

  function confirmarGuardado() {
    setConfirmarCambios(false);
    setGuardado(true);
  }

  return (
    <div className="configuracion-section">

      <section className="configuracion-intro">

        <div>
          <h2>Configuración general</h2>

          <p>
            Administra la información principal y parámetros básicos
            del negocio.
          </p>
        </div>

        {guardado && (
          <span className="configuracion-saved">
            Cambios guardados
          </span>
        )}

      </section>

      <div className="configuracion-grid">

        <section className="configuracion-card">

          <div className="configuracion-card-header">

            <div>
              <h3>Información del negocio</h3>

              <p>
                Datos generales que identifican el establecimiento.
              </p>
            </div>

          </div>

          <div className="configuracion-form-grid">

            <label>
              Nombre del negocio
              <input
                type="text"
                value={configuracion.nombreNegocio}
                onChange={(event) =>
                  actualizarCampo(
                    "nombreNegocio",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              NIT
              <input
                type="text"
                value={configuracion.nit}
                onChange={(event) =>
                  actualizarCampo(
                    "nit",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Teléfono
              <input
                type="text"
                value={configuracion.telefono}
                onChange={(event) =>
                  actualizarCampo(
                    "telefono",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Correo electrónico
              <input
                type="email"
                value={configuracion.email}
                onChange={(event) =>
                  actualizarCampo(
                    "email",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="configuracion-full-field">
              Dirección
              <input
                type="text"
                value={configuracion.direccion}
                onChange={(event) =>
                  actualizarCampo(
                    "direccion",
                    event.target.value
                  )
                }
              />
            </label>

          </div>

        </section>

        <section className="configuracion-card">

          <div className="configuracion-card-header">

            <div>
              <h3>Horario de operación</h3>

              <p>
                Horario general utilizado por el sistema.
              </p>
            </div>

          </div>

          <div className="configuracion-form-grid">

            <label>
              Hora de apertura
              <input
                type="time"
                value={configuracion.horaApertura}
                onChange={(event) =>
                  actualizarCampo(
                    "horaApertura",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Hora de cierre
              <input
                type="time"
                value={configuracion.horaCierre}
                onChange={(event) =>
                  actualizarCampo(
                    "horaCierre",
                    event.target.value
                  )
                }
              />
            </label>

          </div>

          <div className="configuracion-info-box">

            <span>Horario configurado</span>

            <strong>
              {configuracion.horaApertura} –{" "}
              {configuracion.horaCierre}
            </strong>

          </div>

        </section>

        <section className="configuracion-card">

          <div className="configuracion-card-header">

            <div>
              <h3>Facturación y moneda</h3>

              <p>
                Parámetros básicos utilizados en operaciones comerciales.
              </p>
            </div>

          </div>

          <div className="configuracion-form-grid">

            <label>
              Impuesto general (%)
              <input
                type="number"
                min="0"
                max="100"
                value={configuracion.impuesto}
                onChange={(event) =>
                  actualizarCampo(
                    "impuesto",
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Moneda
              <select
                value={configuracion.moneda}
                onChange={(event) =>
                  actualizarCampo(
                    "moneda",
                    event.target.value
                  )
                }
              >
                <option value="COP">
                  Peso colombiano (COP)
                </option>
              </select>
            </label>

          </div>

          <div className="configuracion-info-box">

            <span>Configuración comercial</span>

            <strong>
              IVA {configuracion.impuesto}% ·{" "}
              {configuracion.moneda}
            </strong>

          </div>

        </section>

      </div>

      <section className="configuracion-actions">

        <div>
          <strong>Guardar configuración</strong>

          <p>
            Los cambios importantes deben confirmarse antes de ser
            aplicados.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={solicitarGuardado}
        >
          Guardar cambios
        </button>

      </section>

      {confirmarCambios && (
        <>
          <div
            className="configuracion-overlay"
            onClick={() =>
              setConfirmarCambios(false)
            }
          ></div>

          <div className="configuracion-confirmation">

            <div className="configuracion-confirmation-header">

              <div>
                <p className="page-eyebrow">
                  CONFIRMACIÓN
                </p>

                <h2>
                  Guardar cambios
                </h2>
              </div>

              <button
                className="drawer-close"
                onClick={() =>
                  setConfirmarCambios(false)
                }
              >
                ×
              </button>

            </div>

            <p className="configuracion-confirmation-text">
              Se actualizará la configuración general del negocio con
              los valores ingresados.
            </p>

            <div className="configuracion-confirmation-summary">

              <div>
                <span>Negocio</span>
                <strong>
                  {configuracion.nombreNegocio}
                </strong>
              </div>

              <div>
                <span>Horario</span>
                <strong>
                  {configuracion.horaApertura} –{" "}
                  {configuracion.horaCierre}
                </strong>
              </div>

              <div>
                <span>Impuesto</span>
                <strong>
                  {configuracion.impuesto}%
                </strong>
              </div>

              <div>
                <span>Moneda</span>
                <strong>
                  {configuracion.moneda}
                </strong>
              </div>

            </div>

            <div className="configuracion-confirmation-actions">

              <button
                className="drawer-primary-button"
                onClick={confirmarGuardado}
              >
                Confirmar cambios
              </button>

              <button
                className="drawer-secondary-button"
                onClick={() =>
                  setConfirmarCambios(false)
                }
              >
                Cancelar
              </button>

            </div>

          </div>
        </>
      )}

    </div>
  );
}

export default ConfiguracionSection;