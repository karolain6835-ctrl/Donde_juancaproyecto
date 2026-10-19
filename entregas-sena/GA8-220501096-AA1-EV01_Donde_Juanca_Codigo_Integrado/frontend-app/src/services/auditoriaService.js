import {apiClient} from './apiClient.js';
import {invalidResponse} from './catalogoContract.js';
export const nombreAuditoria=valor=>typeof valor==='string'?valor.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()):'—';
export async function listarAuditoria(filtros={},options){
 const q=new URLSearchParams(Object.entries(filtros).filter(([,v])=>v!==''&&v!=null));
 const r=await apiClient(`/auditoria?${q}`,options);
 if(!Array.isArray(r?.datos)||!r.paginacion||!['pagina','limite','total','total_paginas'].every(k=>Number.isSafeInteger(r.paginacion[k])))throw invalidResponse('auditoría');
 for(const e of r.datos)if(!['id','categoria','tipo_evento','entidad','entidad_id','creado_en','usuarios_id'].every(k=>typeof e[k]==='string')||!(e.usuario_nombre===null||typeof e.usuario_nombre==='string')||!e.detalle||typeof e.detalle!=='object'||Array.isArray(e.detalle)||typeof e.detalle_omitido!=='boolean')throw invalidResponse('auditoría');
 return r;
}
