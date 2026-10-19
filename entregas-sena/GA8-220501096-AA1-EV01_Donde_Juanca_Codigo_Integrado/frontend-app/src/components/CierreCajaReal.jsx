import ModalOperacion from './ModalOperacion';
import {useCallback,useState} from 'react';
import {useRemoteCatalog,useCatalogMutation} from '../hooks/useRemoteCatalog';
import {resumenCierre,arqueoCierre,crearCierre,detalleCierre} from '../services/cierresCajaService';
import {formatCurrency} from '../utils/formatCurrency';
import {formatDateTime} from '../utils/dateTime';
import {metodosPago} from '../services/pagosService';
import OperacionRemoteState from './OperacionRemoteState';
export function ResumenCierre({data,contado}){
 let arqueo;try{arqueo=arqueoCierre(contado,data.efectivo_esperado);}catch{/* La validación se presenta junto al campo. */}
 return <><dl className="cierre-real-info"><div><dt>Pagos incluidos</dt><dd>{data.cantidad_pagos}</dd></div><div><dt>Total verificado</dt><dd>{formatCurrency(data.total_general)}</dd></div><div><dt>Efectivo esperado</dt><dd>{formatCurrency(data.efectivo_esperado)}</dd></div>{arqueo&&<><div><dt>Efectivo contado</dt><dd>{formatCurrency(arqueo.total_efectivo_real)}</dd></div><div><dt>Diferencia</dt><dd>{arqueo.tipo} · {formatCurrency(arqueo.diferencia)}</dd></div></>}</dl><div className="cierre-real-metodos">{Object.entries(metodosPago).map(([k,label])=><p key={k}>{label}: <strong>{formatCurrency(data.por_metodo?.[k])}</strong></p>)}</div></>;
}
export function NuevoCierre({periodo,onClosed,onCancel}){
 const resource=useRemoteCatalog(useCallback(options=>resumenCierre(periodo,options),[periodo]));
 const [contado,setContado]=useState(''),[confirm,setConfirm]=useState(false);
 const mutation=useCatalogMutation();
 let error='';if(contado){try{arqueoCierre(contado,'0.00');}catch(e){error=e.message;}}
 async function guardar(){await mutation.run(async()=>{const cierre=await crearCierre(periodo,contado);await onClosed(cierre);},async()=>{},'Cierre guardado.');}
 return <section className="cierre-real-panel"><h3>Cerrar caja</h3><p>Se incluyen los pagos verificados del período que aún no se han cerrado. El efectivo esperado no incluye saldo inicial, gastos ni retiros.</p>
  <OperacionRemoteState resource={resource}>{resource.data&&<><ResumenCierre data={resource.data} contado={contado}/>
   {!resource.data.cantidad_pagos?<p>No hay pagos disponibles para cerrar en este período.</p>:<><label>Efectivo contado<input type="text" inputMode="decimal" placeholder="50.000" disabled={mutation.busy||confirm} value={contado} onChange={e=>setContado(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}
   {!confirm?<button className="drawer-primary-button" disabled={!contado||Boolean(error)} onClick={()=>setConfirm(true)}>Revisar cierre</button>:<div className="cierre-real-confirm" role="alert"><p>¿Confirmar el cierre con estos valores? Los pagos se vuelven a comprobar al guardar.</p><div className="operacion-actions"><button className="drawer-primary-button" disabled={mutation.busy} onClick={guardar}>{mutation.busy?'Guardando...':'Confirmar cierre'}</button><button className="drawer-secondary-button" disabled={mutation.busy} onClick={()=>setConfirm(false)}>Volver</button></div></div>}</>}
  </>}</OperacionRemoteState>{mutation.error&&<div role="alert"><p>{mutation.error}</p><button disabled={mutation.busy} onClick={()=>{setConfirm(false);resource.refresh();}}>Reintentar consulta</button></div>}
  <button className="drawer-secondary-button" disabled={mutation.busy} onClick={onCancel}>Cancelar</button>
 </section>;
}
export function DetalleCierre({id,onClose}){
 const resource=useRemoteCatalog(useCallback(options=>detalleCierre(id,options),[id]));
 const c=resource.data;
 return <ModalOperacion title="Detalle de cierre" onClose={onClose}><section className="cierre-real-panel"><OperacionRemoteState resource={resource}>{c&&<>
  <p>{formatDateTime(c.fecha)} · {c.responsable_nombre||'—'}</p><p>Período: {formatDateTime(c.fecha_inicio)} — {formatDateTime(c.fecha_fin)}</p>
  <ResumenCierre data={{cantidad_pagos:c.pagos.length,total_general:c.total_general,efectivo_esperado:c.total_efectivo_esperado,por_metodo:c.reporte.datos_json.por_metodo}} contado={String(c.total_efectivo_real).replace('.',',')}/>
  <h4>Pagos incluidos</h4><div className="cierre-real-tabla"><table><thead><tr><th>Pago</th><th>Método</th><th>Valor</th></tr></thead><tbody>{c.pagos.map((p,i)=><tr key={p.id}><td>Pago {i+1}</td><td>{metodosPago[p.metodo_de_pago]}</td><td>{formatCurrency(p.importe)}</td></tr>)}</tbody></table></div>
 </>}</OperacionRemoteState></section></ModalOperacion>;
}
