const { ejecutor } = require('../services/identidadService');
const comprobantes = require('../services/comprobantesService');
exports.comprobantePorPedido = (req,res) => comprobantes.ejecutar(res,c=>comprobantes.porPedido(c,req.params.pedido_id));
exports.generarFactura = (req,res) => {
  const actor = ejecutor(req, res);
  if (!actor) return;
  return comprobantes.ejecutar(res,c=>comprobantes.emitir(c,req.body,actor));
};
exports.listarComprobantes = (req,res) => comprobantes.ejecutar(res,c=>comprobantes.listar(c,req.query),true);
exports.obtenerComprobante = (req,res) => comprobantes.ejecutar(res,async c=>({body:{comprobante:await comprobantes.detalle(c,comprobantes.id(req.params.id))}}),true);
