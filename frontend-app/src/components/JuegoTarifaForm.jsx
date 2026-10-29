import {useState} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useCatalogMutation} from '../hooks/useRemoteCatalog';
import {editarTarifaJuego} from '../services/juegosService';
import {montoCOP,decimalDivision} from '../services/divisionesService';
import ModalOperacion from './ModalOperacion';

export default function JuegoTarifaForm({activo,onChanged,onClose}){
 const {user}=useAuth();
 const [precio,setPrecio]=useState(String(activo.precio_hora).replace('.',','));
 const mutation=useCatalogMutation();
 if(!can(user,'juegos.editarTarifa'))return null;
 async function submit(e){
  e.preventDefault();
  await mutation.run(async()=>{
   const centavos=montoCOP(precio);
   if(centavos>9999999999n)throw new Error('La tarifa no puede superar 99.999.999,99.');
   await editarTarifaJuego(activo.id,decimalDivision(centavos));
   await onChanged();
  },onClose,'Tarifa actualizada.');
 }
 return <ModalOperacion title="Editar tarifa" onClose={onClose} busy={mutation.busy}><form className="catalogo-form" onSubmit={submit}><fieldset disabled={mutation.busy}><p>{activo.nombre}</p><label>Tarifa por hora (COP)<input type="text" inputMode="decimal" value={precio} onChange={e=>setPrecio(e.target.value)} required/></label><p>La nueva tarifa aplica únicamente a sesiones futuras. Las sesiones en curso conservan su tarifa inicial.</p>{mutation.error&&<p role="alert">{mutation.error}</p>}<button className="drawer-primary-button" type="submit">{mutation.busy?'Guardando...':'Guardar tarifa'}</button></fieldset></form></ModalOperacion>;
}
