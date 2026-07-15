const db = require('../config/db');
const crypto = require('crypto'); // Nos ayuda a generar el ID automático (UUID)

// ==========================================
// 1. CREAR UN NUEVO PEDIDO
// ==========================================
const crearPedido = (req, res) => {
  const { mesas_id, usuarios_id, clientes_id } = req.body;

  if (!mesas_id || !usuarios_id || !clientes_id) {
    return res.status(400).json({ 
      error: "Faltan datos. Se requiere la mesa, el usuario que atiende y el cliente." 
    });
  }

  const id = crypto.randomUUID(); 
  const estado = 'abierto';       
  const sincronizado = 0;         
  
  const fechaActual = new Date();
  fechaActual.setHours(fechaActual.getHours() - 5); 
  const creado_en = fechaActual.toISOString().slice(0, 19).replace('T', ' ');

  const query = `
    INSERT INTO pedidos 
    (id, estado, sincronizado, creado_en, mesas_id, usuarios_id, clientes_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [id, estado, sincronizado, creado_en, mesas_id, usuarios_id, clientes_id], (err, resultados) => {
    if (err) {
      console.error('❌ Error al crear el pedido:', err.message);
      return res.status(500).json({ error: 'Hubo un error en el servidor al abrir el pedido.' });
    }

    res.status(201).json({
      mensaje: '¡Cuenta abierta con éxito para la mesa! 🍻',
      id_pedido: id
    });
  });
};

// ==========================================
// 2. AGREGAR UN PRODUCTO AL PEDIDO
// ==========================================
const agregarItemPedido = (req, res) => {
  const { id_pedido } = req.params;
  const { productos_id, cantidad_pedida, precio_unitario } = req.body;

  if (!productos_id || !cantidad_pedida || !precio_unitario) {
    return res.status(400).json({ 
      error: "Faltan datos. Se requiere el producto, la cantidad y el precio." 
    });
  }

  const id = crypto.randomUUID();
  const estado = 'preparando'; 
  const cantidad_pagada = 0;   

  const query = `
    INSERT INTO pedido_items 
    (id, precio_unitario, pedido_id, producto_id, cantidad_pedida, cantidad_pagada, estado, pedidos_id, productos_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [id, precio_unitario, id_pedido, productos_id, cantidad_pedida, cantidad_pagada, estado, id_pedido, productos_id], (err, resultados) => {
    if (err) {
      console.error('❌ Error al agregar producto al pedido:', err.message);
      return res.status(500).json({ error: 'Hubo un error en el servidor al agregar el producto.' });
    }

    res.status(201).json({
      mensaje: '¡Producto agregado a la cuenta exitosamente! 🍺',
      id_item: id
    });
  });
};

// ==========================================
// 3. CONSULTAR LA CUENTA COMPLETA
// ==========================================
const obtenerPedidoConDetalles = (req, res) => {
  const { id } = req.params;

  const queryPedido = 'SELECT * FROM pedidos WHERE id = ?';
  
  const queryItems = `
    SELECT pi.id, pi.cantidad_pedida, pi.precio_unitario, pi.estado, p.nombre 
    FROM pedido_items pi
    JOIN productos p ON pi.productos_id = p.id
    WHERE pi.pedidos_id = ?
  `;

  db.query(queryPedido, [id], (err, resultadosPedido) => {
    if (err) return res.status(500).json({ error: 'Hubo un error al buscar el pedido.' });
    if (resultadosPedido.length === 0) return res.status(404).json({ error: 'Pedido no encontrado.' });

    const pedido = resultadosPedido[0];

    db.query(queryItems, [id], (err, resultadosItems) => {
      if (err) return res.status(500).json({ error: 'Hubo un error al buscar los detalles del pedido.' });

      pedido.items = resultadosItems;

      res.json({
        mensaje: 'Detalle de la cuenta cargado con éxito 📋',
        datos: pedido
      });
    });
  });
};

// ==========================================
// EXPORTAR TODAS LAS FUNCIONES AL FINAL
// ==========================================
module.exports = {
  crearPedido,
  agregarItemPedido,
  obtenerPedidoConDetalles
};