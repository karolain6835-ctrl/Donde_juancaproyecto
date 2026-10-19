import { useEffect, useRef, useState } from "react";

import {
  Settings2,
  Building2,
  Clock3,
  ReceiptText,
  Phone,
  Mail,
  MapPin,
  BadgePercent,
  Coins,
  Save,
  CircleCheck,
  X,
  ShieldCheck,
} from "lucide-react";

import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {configuracionVacia,consultarConfiguracion,guardarConfiguracion} from '../services/configuracionService';
import "./ConfiguracionSection.css";

function ConfiguracionSection() {
  const {user}=useAuth();
  const permitido=can(user,'configuracion.ver');
  const editable=can(user,'configuracion.editar');
  const [configuracion,setConfiguracion]=useState({...configuracionVacia});
  const [persistida,setPersistida]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const lock=useRef(false);
  const dirty=persistida!==null&&JSON.stringify(persistida)!==JSON.stringify(configuracion);
  useEffect(()=>{
    if(!permitido)return;
    const controller=new AbortController();
    consultarConfiguracion({signal:controller.signal}).then(data=>{
      if(!controller.signal.aborted){setConfiguracion(data);setPersistida(data);setError('');setLoading(false);}
    }).catch(e=>{if(!controller.signal.aborted){setError(e.message);setLoading(false);}});
    return ()=>controller.abort();
  },[permitido,retry]);

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
    if(editable&&!saving&&dirty)setConfirmarCambios(true);
  }

  async function confirmarGuardado() {
    if(lock.current||!editable)return;
    lock.current=true;setSaving(true);setError('');setGuardado(false);
    try{
      const data=await guardarConfiguracion(configuracion);
      setConfiguracion(data);setPersistida(data);setGuardado(true);setConfirmarCambios(false);
    }catch(e){setError(e.message);}
    finally{lock.current=false;setSaving(false);}
  }
  if(!permitido)return <p>No tienes permiso para consultar la configuración.</p>;
  if(loading)return <p role="status">Cargando configuración...</p>;
  if(!persistida)return <div role="alert">{error}<button onClick={()=>{setLoading(true);setRetry(v=>v+1);}}>Reintentar</button></div>;

  return (
    <div className="configuracion-section">
      {error&&<p role="alert">{error}</p>}
      {dirty&&<p role="status">Hay cambios sin guardar.</p>}
      <fieldset className="configuracion-fields" disabled={saving||!editable}>

      <section className="configuracion-intro">

        <div>
          <h2>
            Configuración general
          </h2>

          <p>
            Administra la información principal y parámetros básicos
            del negocio.
          </p>
        </div>

        {guardado && (
          <span className="configuracion-saved" role="status">

            <CircleCheck
              size={14}
              strokeWidth={1.9}
            />

            Cambios guardados
          </span>
        )}

      </section>

      <div className="configuracion-grid">

        <section className="configuracion-card configuracion-card-business">

          <div className="configuracion-card-header">

            <div className="configuracion-card-title">

              <div className="configuracion-card-icon">
                <Building2
                  size={18}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h3>
                  Información del negocio
                </h3>

                <p>
                  Datos generales que identifican el establecimiento.
                </p>
              </div>

            </div>

          </div>

          <div className="configuracion-form-grid">

            <label>
              Nombre del negocio

              <div className="configuracion-input-wrapper">

                <Building2
                  size={16}
                  strokeWidth={1.9}
                />

                <input
                  type="text"
                  placeholder="Nombre del negocio"
                  value={configuracion.nombreNegocio}
                  onChange={(event) =>
                    actualizarCampo(
                      "nombreNegocio",
                      event.target.value
                    )
                  }
                />

              </div>

            </label>

            <label>
              NIT

              <div className="configuracion-input-wrapper">

                <ReceiptText
                  size={16}
                  strokeWidth={1.9}
                />

                <input
                  type="text"
                  placeholder="NIT"
                  value={configuracion.nit}
                  onChange={(event) =>
                    actualizarCampo(
                      "nit",
                      event.target.value
                    )
                  }
                />

              </div>

            </label>

            <label>
              Teléfono

              <div className="configuracion-input-wrapper">

                <Phone
                  size={16}
                  strokeWidth={1.9}
                />

                <input
                  type="text"
                  placeholder="Teléfono"
                  value={configuracion.telefono}
                  onChange={(event) =>
                    actualizarCampo(
                      "telefono",
                      event.target.value
                    )
                  }
                />

              </div>

            </label>

            <label>
              Correo electrónico

              <div className="configuracion-input-wrapper">

                <Mail
                  size={16}
                  strokeWidth={1.9}
                />

                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={configuracion.email}
                  onChange={(event) =>
                    actualizarCampo(
                      "email",
                      event.target.value
                    )
                  }
                />

              </div>

            </label>

            <label className="configuracion-full-field">
              Dirección

              <div className="configuracion-input-wrapper">

                <MapPin
                  size={16}
                  strokeWidth={1.9}
                />

                <input
                  type="text"
                  placeholder="Dirección"
                  value={configuracion.direccion}
                  onChange={(event) =>
                    actualizarCampo(
                      "direccion",
                      event.target.value
                    )
                  }
                />

              </div>

            </label>

          </div>

        </section>

        <section className="configuracion-card">

          <div className="configuracion-card-header">

            <div className="configuracion-card-title">

              <div className="configuracion-card-icon">
                <Clock3
                  size={18}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h3>
                  Horario de operación
                </h3>

                <p>
                  Horario general del establecimiento.
                </p>
              </div>

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

            <div className="configuracion-info-icon">
              <Clock3
                size={17}
                strokeWidth={1.9}
              />
            </div>

            <div>
              <span>
                Horario configurado
              </span>

              <strong>
                {configuracion.horaApertura} –{" "}
                {configuracion.horaCierre}
              </strong>
            </div>

          </div>

        </section>

        <section className="configuracion-card">

          <div className="configuracion-card-header">

            <div className="configuracion-card-title">

              <div className="configuracion-card-icon">
                <ReceiptText
                  size={18}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h3>
                  Facturación y moneda
                </h3>

                <p>
                  Información administrativa. No modifica los totales de los pedidos.
                </p>
              </div>

            </div>

          </div>

          <div className="configuracion-form-grid">

            <label>
              Impuesto general (%)

              <div className="configuracion-input-wrapper">

                <BadgePercent
                  size={16}
                  strokeWidth={1.9}
                />

                <input
                  type="number"
                  step="0.01"
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

              </div>

            </label>

            <label>
              Moneda

              <div className="configuracion-input-wrapper">

                <Coins
                  size={16}
                  strokeWidth={1.9}
                />

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

              </div>

            </label>

          </div>

          <div className="configuracion-info-box">

            <div className="configuracion-info-icon">
              <Coins
                size={17}
                strokeWidth={1.9}
              />
            </div>

            <div>
              <span>
                Configuración comercial
              </span>

              <strong>
                {configuracion.impuesto === "" ? "Impuesto sin configurar" : `Impuesto ${configuracion.impuesto}%`} ·{" "}
                {configuracion.moneda}
              </strong>
            </div>

          </div>

        </section>

      </div>

      <section className="configuracion-actions">

        <div className="configuracion-actions-info">

          <div className="configuracion-actions-icon">
            <Settings2
              size={19}
              strokeWidth={1.9}
            />
          </div>

          <div>
            <strong>
              Guardar configuración
            </strong>

            <p>
              Los cambios importantes deben confirmarse antes de ser
              aplicados.
            </p>
          </div>

        </div>

        <button
          type="button"
          className="primary-button configuracion-save-button"
          disabled={!dirty||saving||!editable}
          onClick={solicitarGuardado}
        >
          <Save
            size={17}
            strokeWidth={1.9}
          />

          Guardar cambios
        </button>

      </section>

      {confirmarCambios && (
        <>

          <div
            className="configuracion-overlay"
            onClick={() =>
              !saving && setConfirmarCambios(false)
            }
          ></div>

          <div className="configuracion-confirmation" role="dialog" aria-modal="true" aria-label="Guardar configuración">

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
                type="button"
                className="drawer-close"
                onClick={() =>
                  !saving && setConfirmarCambios(false)
                }
                aria-label="Cerrar confirmación"
              >
                <X
                  size={20}
                  strokeWidth={1.9}
                />
              </button>

            </div>

            <div className="configuracion-confirmation-notice">

              <ShieldCheck
                size={19}
                strokeWidth={1.9}
              />

              <p className="configuracion-confirmation-text">
                Se actualizará la configuración general del negocio con
                los valores ingresados.
              </p>

            </div>

            {error&&<p role="alert">{error}</p>}
            <div className="configuracion-confirmation-summary">

              <div>
                <span>
                  Negocio
                </span>

                <strong>
                  {configuracion.nombreNegocio}
                </strong>
              </div>

              <div>
                <span>
                  Horario
                </span>

                <strong>
                  {configuracion.horaApertura} –{" "}
                  {configuracion.horaCierre}
                </strong>
              </div>

              <div>
                <span>
                  Impuesto
                </span>

                <strong>
                  {configuracion.impuesto}%
                </strong>
              </div>

              <div>
                <span>
                  Moneda
                </span>

                <strong>
                  {configuracion.moneda}
                </strong>
              </div>

            </div>

            <div className="configuracion-confirmation-actions">

              <button
                type="button"
                className="drawer-primary-button configuracion-confirm-button"
                disabled={saving}
                onClick={confirmarGuardado}
              >
                <CircleCheck
                  size={17}
                  strokeWidth={1.9}
                />

                {saving ? "Guardando..." : error ? "Reintentar" : "Confirmar cambios"}
              </button>

              <button
                type="button"
                className="drawer-secondary-button"
                onClick={() =>
                  !saving && setConfirmarCambios(false)
                }
              >
                Cancelar
              </button>

            </div>

          </div>

        </>
      )}

      </fieldset>
    </div>
  );
}

export default ConfiguracionSection;