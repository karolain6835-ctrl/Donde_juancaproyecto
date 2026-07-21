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
// ==========================================
// 2. AGREGAR UN PRODUCTO AL PEDIDO Y DESCONTAR INVENTARIO
// ==========================================
const agregarItemPedido = (req, res) => {
  const { id_pedido } = req.params;
  const { productos_id, cantidad_pedida, precio_unitario } = req.body;

  if (!productos_id || !cantidad_pedida || !precio_unitario) {
    return res.status(400).json({ 
      error: "Faltan datos. Se requiere el producto, la cantidad y el precio." 
    });
  }

  // Iniciamos transacción para asegurar que el registro del item y el descuento de stock ocurran juntos
  db.beginTransaction((errTx) => {
    if (errTx) {
      console.error('❌ Error al iniciar transacción:', errTx.message);
      return res.status(500).json({ error: 'Error en el servidor al procesar la solicitud.' });
    }

    // 1. Verificar stock actual del producto
    const sqlStock = 'SELECT stock, nombre FROM productos WHERE id = ? FOR UPDATE';

    db.query(sqlStock, [productos_id], (errStock, resStock) => {
      if (errStock) {
        return db.rollback(() => {
          console.error('❌ Error al consultar stock:', errStock.message);
          res.status(500).json({ error: 'Error al verificar el inventario del producto.' });
        });
      }

      if (resStock.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ error: 'El producto especificado no existe.' });
        });
      }

      const producto = resStock[0];

      // Validar si hay stock suficiente
      if (producto.stock < cantidad_pedida) {
        return db.rollback(() => {
          res.status(400).json({ 
            error: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, solicitado: ${cantidad_pedida}.` 
          });
        });
      }

      // 2. Insertar el ítem en la tabla pedido_items
      const idItem = crypto.randomUUID();
      const estado = 'preparando'; 
      const cantidad_pagada = 0; 

      const sqlInsert = `
        INSERT INTO pedido_items 
        (id, precio_unitario, pedido_id, producto_id, cantidad_pedida, cantidad_pagada, estado, pedidos_id, productos_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        sqlInsert, 
        [idItem, precio_unitario, id_pedido, productos_id, cantidad_pedida, cantidad_pagada, estado, id_pedido, productos_id], 
        (errInsert) => {
          if (errInsert) {
            return db.rollback(() => {
              console.error('❌ Error al insertar item:', errInsert.message);
              res.status(500).json({ error: 'Error al agregar el producto al pedido.' });
            });
          }

          // 3. Descontar el stock en la tabla productos
          const sqlUpdateStock = 'UPDATE productos SET stock = stock - ? WHERE id = ?';

          db.query(sqlUpdateStock, [cantidad_pedida, productos_id], (errUpdate) => {
            if (errUpdate) {
              return db.rollback(() => {
                console.error('❌ Error al descontar inventario:', errUpdate.message);
                res.status(500).json({ error: 'Error al actualizar el inventario.' });
              });
            }

            // Confirmar todos los cambios en la BD
            db.commit((errCommit) => {
              if (errCommit) {
                return db.rollback(() => {
                  console.error('❌ Error al confirmar transacción:', errCommit.message);
                  res.status(500).json({ error: 'Error al finalizar el registro del item.' });
                });
              }

              return res.status(201).json({
                mensaje: '¡Producto agregado y stock descontado exitosamente! 🍺',
                id_item: idItem,
                stock_restante: producto.stock - cantidad_pedida
              });
            });
          });
        }
      );
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
// 4. CALCULAR CUENTA CONSOLIDADA (PRODUCTOS + JUEGOS)
// ==========================================
const obtenerCuentaConsolidada = (req, res) => {
  const { id } = req.params; // ID de la mesa o pedido

  const queryProductos = `
    SELECT pi.productos_id, p.nombre, pi.cantidad_pedida, pi.precio_unitario, 
           (pi.cantidad_pedida * pi.precio_unitario) AS subtotal
    FROM pedido_items pi
    JOIN productos p ON pi.productos_id = p.id
    JOIN pedidos ped ON pi.pedidos_id = ped.id
    WHERE ped.mesas_id = ? AND ped.estado = 'abierto'
  `;

  const queryJuegos = `
    SELECT id, activos_juego_id, fecha_inicio, fecha_fin, precio_hora,
           ROUND((TIMESTAMPDIFF(MINUTE, fecha_inicio, NOW()) / 60) * precio_hora, 2) AS costo_tiempo
    FROM sesiones_juego
    WHERE mesas_id = ? AND estado = 'en_progreso'
  `;

  db.query(queryProductos, [id], (err, productos) => {
    if (err) {
      console.error('❌ Error al consultar productos:', err.message);
      return res.status(500).json({ error: 'Error al consultar consumos de productos.' });
    }

    db.query(queryJuegos, [id], (err, juegos) => {
      if (err) {
        // Si la tabla sesiones_juego aún no tiene registros o varía, retornamos lista vacía de juegos sin tumbar el endpoint
        juegos = [];
      }

      const totalProductos = (productos || []).reduce((acc, item) => acc + parseFloat(item.subtotal || 0), 0);
      const totalJuegos = (juegos || []).reduce((acc, item) => acc + parseFloat(item.costo_tiempo || 0), 0);
      const totalGeneral = totalProductos + totalJuegos;

      return res.status(200).json({
        exito: true,
        mensaje: 'Cuenta consolidada calculada exitosamente 📊',
        data: {
          mesa_id: id,
          resumen: {
            subtotal_productos: totalProductos.toFixed(2),
            subtotal_juegos: totalJuegos.toFixed(2),
            total_general: totalGeneral.toFixed(2)
          },
          detalle_productos: productos || [],
          detalle_juegos: juegos || []
        }
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
  obtenerPedidoConDetalles,
  obtenerCuentaConsolidada
};

