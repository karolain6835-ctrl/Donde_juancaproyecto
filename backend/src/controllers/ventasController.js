const { ejecutor } = require('../services/identidadService');
// 1. Crear un nuevo pedido/orden de consumo (Simulado)
exports.crearPedido = async (req, res) => {
  const { mesa_id, cliente_id, items } = req.body;

  if (!mesa_id || !items || items.length === 0) {
    return res.status(400).json({ error: 'Debes indicar la mesa_id y al menos un producto en items.' });
  }

  res.status(201).json({
    mensaje: "¡Pedido registrado con éxito en la mesa! 📝🍻",
    pedido_id: "PED-999",
    mesa_id,
    cliente_id: cliente_id || "Consumidor Final",
    items_registrados: items.length
  });
};

const comprobantes = require('../services/comprobantesService');
exports.generarFactura = (req,res) => {
  const actor = ejecutor(req, res);
  if (!actor) return;
  return comprobantes.ejecutar(res,c=>comprobantes.emitir(c,req.body,actor));
};
exports.listarComprobantes = (req,res) => comprobantes.ejecutar(res,c=>comprobantes.listar(c,req.query),true);
exports.obtenerComprobante = (req,res) => comprobantes.ejecutar(res,async c=>({body:{comprobante:await comprobantes.detalle(c,comprobantes.id(req.params.id))}}),true);
