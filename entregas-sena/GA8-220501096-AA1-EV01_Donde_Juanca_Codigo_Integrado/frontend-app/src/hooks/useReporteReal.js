import {useCallback} from 'react';
import {useAuth} from '../context/useAuth';
import {can} from '../utils/permissions';
import {useRemoteCatalog} from './useRemoteCatalog';
import {cargarReporte,rangoReporte} from '../services/reportesService';
const permisos={ventas:'comprobantes.ver',productos:'inventario.movimientos',inventario:'inventario.movimientos',juegos:'inventario.movimientos',caja:'cierres.ver'};
export function useReporteReal(tipo,periodo,desde,hasta,pagina){
 const {user}=useAuth();const permitido=can(user,permisos[tipo]);
 const resource=useRemoteCatalog(useCallback(options=>{
  if(!permitido)return Promise.resolve(null);
  return cargarReporte(tipo,tipo==='inventario'?null:rangoReporte(periodo,desde,hasta),pagina,options);
 },[tipo,periodo,desde,hasta,pagina,permitido]));
 return {...resource,permitido};
}
