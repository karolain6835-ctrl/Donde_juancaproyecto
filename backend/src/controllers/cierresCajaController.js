const s=require('../services/cierresCajaService');
exports.resumen=(req,res)=>s.ejecutar(res,async c=>{
  const [inicio,fin]=s.periodo(req.query);
  return {body:s.resumen(await s.elegibles(c,inicio,fin),inicio,fin)};
},true);
exports.crear=(req,res)=>s.ejecutar(res,c=>s.crear(c,req.body));
exports.listar=(req,res)=>s.ejecutar(res,c=>s.listar(c,req.query),true);
exports.detalle=(req,res)=>s.ejecutar(res,async c=>({body:{cierre:await s.detalle(c,req.params.id)}}),true);
