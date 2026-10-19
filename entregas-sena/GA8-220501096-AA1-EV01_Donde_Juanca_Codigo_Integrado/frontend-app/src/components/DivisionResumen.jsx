import {formatCurrency} from '../utils/formatCurrency';
import {modalidadesDivision,estadosDivision,disponiblePagador} from '../services/divisionesService';
export default function DivisionResumen({data,renderPagos}){
 return <section className="division-resumen" aria-label="Resumen de división">
  <div className="division-heading"><h3>División de cuenta</h3><span className={`division-estado ${data.estado}`}>{estadosDivision[data.estado]}</span></div>
  <p>{modalidadesDivision[data.modalidad]}</p>
  {data.desactualizada&&<p className="division-aviso" role="alert">La cuenta cambió después de crear esta división. Revisa los nuevos consumos antes de continuar con los pagos.</p>}
  {data.estado!=='activa'&&<p>Esta división está {estadosDivision[data.estado].toLowerCase()} y no permite cambios.</p>}
  <dl className="division-totales"><div><dt>Total asignado</dt><dd>{formatCurrency(data.total_asignado)}</dd></div><div><dt>Pagado</dt><dd>{formatCurrency(data.total_pagado)}</dd></div><div><dt>Pendiente de verificación</dt><dd>{formatCurrency(data.pendiente_verificacion)}</dd></div><div><dt>Saldo por pagar</dt><dd>{formatCurrency(disponiblePagador({saldo:data.total_pendiente,pendiente_verificacion:data.pendiente_verificacion}))}</dd></div></dl>
  {!data.participantes.length&&<p>Aún no hay clientes con productos o montos asignados.</p>}
  <div className="division-personas">{data.participantes.map(p=><article key={p.id} className="division-persona"><strong>{p.nombre_cliente}</strong><dl className="division-totales">
   <div><dt>Asignado</dt><dd>{formatCurrency(p.asignado)}</dd></div><div><dt>Pagado</dt><dd>{formatCurrency(p.pagado)}</dd></div><div><dt>Pendiente de verificación</dt><dd>{formatCurrency(p.pendiente_verificacion)}</dd></div><div><dt>Saldo por pagar</dt><dd>{formatCurrency(disponiblePagador(p))}</dd></div>
  </dl>{renderPagos?.(p)}</article>)}</div><small>Los pagos pendientes aún requieren verificación. El saldo por pagar descuenta esos pagos pendientes.</small>
 </section>;
}

