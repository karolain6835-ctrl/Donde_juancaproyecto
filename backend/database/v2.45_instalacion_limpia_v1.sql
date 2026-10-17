-- v2.45: baseline acumulativa V1; SOLO para una base VACIA.
-- DDL auditado contra MariaDB 10.4.32-MariaDB; sin filas de negocio ni credenciales.
-- NO ejecutar sobre instalaciones existentes ni repetir v1.0-v2.44 despues.
-- Tablas primero, FKs despues (checks activos), rutina y triggers al final.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE `activos_juego` (
  `id` varchar(36) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `estado` enum('disponible','ocupado','mantenimiento') NOT NULL,
  `tipo` enum('tejo','billar','juego') NOT NULL,
  `precio_hora` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `alertas_inventario` (
  `id` varchar(36) NOT NULL,
  `tipo` enum('bajo','agotado') NOT NULL,
  `estado` enum('activa','vista','silenciada','resuelta') NOT NULL,
  `creado_en` datetime NOT NULL,
  `productos_id` varchar(36) NOT NULL,
  `modelo_episodio` enum('legado','v2') NOT NULL DEFAULT 'legado',
  `stock_observado` int(11) DEFAULT NULL,
  `stock_minimo` int(11) DEFAULT NULL,
  `actualizado_en` datetime DEFAULT NULL,
  `resuelto_en` datetime DEFAULT NULL,
  `vista_por` varchar(36) DEFAULT NULL,
  `silenciada_por` varchar(36) DEFAULT NULL,
  `resuelta_por` varchar(36) DEFAULT NULL,
  `producto_abierto` varchar(36) GENERATED ALWAYS AS (case when `modelo_episodio` = 'v2' and `estado` <> 'resuelta' then `productos_id` else NULL end) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_alerta_producto_abierto` (`producto_abierto`),
  KEY `fk_alertas_inventario_productos1_idx` (`productos_id`),
  KEY `idx_alertas_estado_fecha` (`modelo_episodio`,`estado`,`creado_en`,`id`),
  KEY `idx_alertas_producto_fecha` (`productos_id`,`creado_en`,`id`),
  KEY `fk_alerta_vista_usuario` (`vista_por`),
  KEY `fk_alerta_silencio_usuario` (`silenciada_por`),
  KEY `fk_alerta_resolucion_usuario` (`resuelta_por`),
  CONSTRAINT `chk_alerta_episodio_v2` CHECK (`modelo_episodio` = 'legado' or `stock_observado` is not null and `stock_minimo` is not null and `actualizado_en` is not null and (`estado` = 'resuelta' and `resuelto_en` is not null or `estado` <> 'resuelta' and `resuelto_en` is null))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `alertas_inventario_historial` (
  `id` varchar(36) NOT NULL,
  `secuencia` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `alertas_inventario_id` varchar(36) NOT NULL,
  `evento` enum('alerta_creada','alerta_vista','alerta_silenciada','alerta_reactivada','alerta_resuelta_automaticamente','alerta_resuelta_manualmente','cambio_condicion','stock_observado') NOT NULL,
  `origen` enum('automatico','humano') NOT NULL,
  `usuarios_id` varchar(36) DEFAULT NULL,
  `cambios_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`cambios_json`)),
  `creado_en` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_alerta_historial_secuencia` (`secuencia`),
  KEY `idx_alerta_historial_fecha` (`alertas_inventario_id`,`secuencia`),
  KEY `fk_alerta_historial_usuario` (`usuarios_id`),
  CONSTRAINT `chk_alerta_historial_actor` CHECK (`origen` = 'automatico' and `usuarios_id` is null or `origen` = 'humano' and `usuarios_id` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `auditoria` (
  `id` varchar(36) NOT NULL,
  `categoria` varchar(45) NOT NULL,
  `tipo_evento` varchar(100) NOT NULL,
  `entidad` varchar(36) NOT NULL,
  `entidad_id` varchar(100) NOT NULL,
  `cambios_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`cambios_json`)),
  `resultado` enum('exitoso','fallido') DEFAULT NULL,
  `creado_en` datetime NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_auditoria_usuarios1_idx` (`usuarios_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `icono` varchar(255) DEFAULT NULL,
  `activo` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `cierre_pagos` (
  `id` varchar(36) NOT NULL,
  `cierres_caja_id` varchar(36) NOT NULL,
  `pagos_id` varchar(20) NOT NULL,
  `importe` decimal(12,2) NOT NULL,
  `metodo_de_pago` enum('efectivo','nequi','daviplata','tarjeta') NOT NULL,
  `incluido_en` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cierre_pagos_pago` (`pagos_id`),
  KEY `idx_cierre_pagos_cierre_metodo` (`cierres_caja_id`,`metodo_de_pago`),
  CONSTRAINT `chk_cierre_pagos_importe` CHECK (`importe` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `cierres_caja` (
  `id` varchar(36) NOT NULL,
  `fecha` datetime NOT NULL,
  `total_efectivo_esperado` decimal(12,2) NOT NULL,
  `total_efectivo_real` decimal(12,2) NOT NULL,
  `diferencia_efectivo` decimal(12,2) NOT NULL,
  `total_general` decimal(12,2) NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  `reportes_generados_id` varchar(36) NOT NULL,
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_cierres_caja_usuarios1_idx` (`usuarios_id`),
  KEY `fk_cierres_caja_reportes_generados1_idx` (`reportes_generados_id`),
  KEY `idx_fecha_cierre` (`fecha`),
  KEY `idx_cierres_periodo` (`fecha_inicio`,`fecha_fin`),
  CONSTRAINT `chk_cierres_periodo` CHECK (`fecha_inicio` is null and `fecha_fin` is null or `fecha_inicio` is not null and `fecha_fin` is not null and `fecha_inicio` < `fecha_fin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `clientes` (
  `id` varchar(36) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `estado` enum('activo','inactivo') NOT NULL,
  `delete_at` datetime DEFAULT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_UNIQUE` (`email`),
  KEY `fk_clientes_usuarios1_idx` (`usuarios_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `cola_eventos_offline` (
  `id` varchar(36) NOT NULL,
  `dispositivo_id` varchar(100) NOT NULL,
  `tipo_evento` varchar(100) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `estado` enum('pendiente','sincronizado','fallido') NOT NULL,
  `intento_numero` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `compra_items` (
  `id` varchar(36) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `compras_id` varchar(36) NOT NULL,
  `productos_id` varchar(36) NOT NULL,
  `cantidad_cancelada` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_compra_items_compras1_idx` (`compras_id`),
  KEY `fk_compra_items_productos1_idx` (`productos_id`),
  CONSTRAINT `chk_compra_items_cancelada` CHECK (`cantidad_cancelada` is null or `cantidad_cancelada` >= 0 and `cantidad_cancelada` <= `cantidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `compras` (
  `id` varchar(36) NOT NULL,
  `estado` enum('pendiente','parcialmente_recibida','recibida','cancelada','cerrada_parcial') NOT NULL,
  `total_estimado` decimal(10,2) NOT NULL,
  `total_recibido` decimal(10,2) NOT NULL,
  `creado_en` datetime NOT NULL,
  `proveedores_id` varchar(36) NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  `modelo_recepcion` enum('legado','v2') NOT NULL DEFAULT 'legado',
  PRIMARY KEY (`id`),
  KEY `fk_compras_proveedores1_idx` (`proveedores_id`),
  KEY `fk_compras_usuarios1_idx` (`usuarios_id`),
  KEY `idx_compras_fecha_id` (`creado_en`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `comprobante_items` (
  `id` varchar(36) NOT NULL,
  `comprobantes_id` varchar(36) NOT NULL,
  `renglon` int(10) unsigned NOT NULL,
  `tipo` enum('producto','juego') NOT NULL,
  `referencia_id` varchar(36) NOT NULL,
  `descripcion` varchar(100) NOT NULL,
  `cantidad` int(10) unsigned NOT NULL,
  `precio_unitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_comprobante_renglon` (`comprobantes_id`,`renglon`),
  UNIQUE KEY `uq_comprobante_origen` (`comprobantes_id`,`tipo`,`referencia_id`),
  CONSTRAINT `chk_comprobante_items_importes` CHECK (`renglon` > 0 and `cantidad` > 0 and `precio_unitario` >= 0 and `subtotal` = `cantidad` * `precio_unitario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `comprobantes` (
  `id` varchar(36) NOT NULL,
  `numero` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `pedidos_id` varchar(36) NOT NULL,
  `clientes_id` varchar(36) NOT NULL,
  `cliente_nombre` varchar(100) NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  `emitido_en` datetime NOT NULL,
  `total_productos` decimal(12,2) NOT NULL,
  `total_juegos` decimal(12,2) NOT NULL,
  `total_general` decimal(12,2) NOT NULL,
  `total_pagado` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_comprobantes_numero` (`numero`),
  UNIQUE KEY `uq_comprobantes_pedido` (`pedidos_id`),
  KEY `idx_comprobantes_fecha_id` (`emitido_en`,`id`),
  KEY `idx_comprobantes_cliente` (`clientes_id`),
  KEY `idx_comprobantes_usuario` (`usuarios_id`),
  CONSTRAINT `chk_comprobantes_importes` CHECK (`total_productos` >= 0 and `total_juegos` >= 0 and `total_general` = `total_productos` + `total_juegos` and `total_pagado` = `total_general`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `configuracion_negocio` (
  `id` tinyint(3) unsigned NOT NULL,
  `nombreNegocio` varchar(150) DEFAULT NULL,
  `nit` varchar(30) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `horaApertura` char(5) DEFAULT NULL,
  `horaCierre` char(5) DEFAULT NULL,
  `impuesto` decimal(5,2) DEFAULT NULL,
  `moneda` char(3) NOT NULL DEFAULT 'COP',
  `actualizado_en` datetime DEFAULT NULL,
  `actualizado_por` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_configuracion_usuario` (`actualizado_por`),
  CONSTRAINT `chk_configuracion_unica` CHECK (`id` = 1),
  CONSTRAINT `chk_configuracion_impuesto` CHECK (`impuesto` is null or `impuesto` between 0 and 100),
  CONSTRAINT `chk_configuracion_moneda` CHECK (`moneda` = 'COP')
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `conflictos_sincronizacion` (
  `id` varchar(36) NOT NULL,
  `tipo_conflicto` enum('stock_negativo','version_error') DEFAULT NULL,
  `estado` enum('auto_resuelto','pendiente_manual') NOT NULL,
  `cola_eventos_offline_id` varchar(36) NOT NULL,
  `dispositivos_id` varchar(100) NOT NULL,
  `resuelto_por` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_conflictos_sincronizacion_cola_eventos_offline1_idx` (`cola_eventos_offline_id`),
  KEY `fk_conflictos_sincronizacion_dispositivos1_idx` (`dispositivos_id`),
  KEY `fk_conflictos_sincronizacion_usuarios1_idx` (`resuelto_por`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `dispositivos` (
  `id` varchar(100) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `activo` tinyint(4) DEFAULT NULL,
  `ultima_sincronizacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `division_items_detalle` (
  `id` varchar(36) NOT NULL,
  `participante_id` varchar(36) NOT NULL,
  `pedido_item_id` varchar(36) NOT NULL,
  `cantidad_asignada` int(11) NOT NULL DEFAULT 1,
  `subtotal` decimal(10,2) NOT NULL,
  `creado_en` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_det_participante` (`participante_id`),
  KEY `idx_det_pedido_item` (`pedido_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `division_participantes` (
  `id` varchar(36) NOT NULL,
  `sesion_division_id` varchar(36) NOT NULL,
  `nombre_cliente` varchar(100) NOT NULL,
  `total_asignado` decimal(10,2) DEFAULT 0.00,
  `estado` enum('pendiente','pagado') DEFAULT 'pendiente',
  `creado_en` datetime DEFAULT current_timestamp(),
  `jugadores_id` varchar(36) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `idempotencia_clave` varchar(128) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `solicitud_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_division_asignacion_clave` (`sesion_division_id`,`idempotencia_clave`),
  KEY `idx_part_sesion` (`sesion_division_id`),
  KEY `idx_division_pagador` (`jugadores_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `historial_cambios_mesa` (
  `id` int(11) NOT NULL,
  `pedidos_trasladados` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`pedidos_trasladados`)),
  `fue_reversion` tinyint(4) DEFAULT NULL,
  `creado_en` datetime NOT NULL,
  `mesas_id` varchar(36) NOT NULL,
  `mesas_id1` varchar(36) NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_historial_cambios_mesa_mesas1_idx` (`mesas_id`),
  KEY `fk_historial_cambios_mesa_mesas2_idx` (`mesas_id1`),
  KEY `fk_historial_cambios_mesa_usuarios1_idx` (`usuarios_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `historial_costos` (
  `id` varchar(36) NOT NULL,
  `costo_unitario` decimal(10,2) NOT NULL,
  `costo_promedio_ponderado` decimal(10,2) NOT NULL,
  `creado_en` datetime NOT NULL,
  `compras_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_historial_costos_compras1_idx` (`compras_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `historial_costos_recepciones` (
  `id` varchar(36) NOT NULL,
  `productos_id` varchar(36) NOT NULL,
  `compras_id` varchar(36) NOT NULL,
  `recepcion_compra_items_id` varchar(36) NOT NULL,
  `evento` enum('recepcion','reverso') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `costo_unitario` decimal(10,2) NOT NULL,
  `stock_antes` int(11) NOT NULL,
  `stock_despues` int(11) NOT NULL,
  `cpp_antes` decimal(10,2) NOT NULL,
  `cpp_despues` decimal(10,2) NOT NULL,
  `version_antes` bigint(20) unsigned NOT NULL,
  `version_despues` bigint(20) unsigned NOT NULL,
  `residuo_redondeo_centavos` bigint(20) NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  `creado_en` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_historial_recepcion_evento` (`recepcion_compra_items_id`,`evento`),
  KEY `idx_historial_producto_fecha` (`productos_id`,`creado_en`,`id`),
  KEY `idx_historial_compra_fecha` (`compras_id`,`creado_en`,`id`),
  KEY `fk_historial_recepcion_usuario` (`usuarios_id`),
  CONSTRAINT `chk_historial_recepcion_valores` CHECK (`stock_antes` >= 0 and `stock_despues` >= 0 and `costo_unitario` >= 0 and `cpp_antes` >= 0 and `cpp_despues` >= 0 and `stock_despues` = `stock_antes` + `cantidad` and `version_despues` = `version_antes` + 1 and (`evento` = 'recepcion' and `cantidad` > 0 or `evento` = 'reverso' and `cantidad` < 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `historial_estados_activo` (
  `id` varchar(36) NOT NULL,
  `estado_anterior` enum('disponible','ocupado','mantenimiento') NOT NULL,
  `estado_nuevo` enum('disponible','ocupado','mantenimiento') NOT NULL,
  `motivo` varchar(300) DEFAULT NULL,
  `tipo_mantenimiento` enum('correctivo','preventivo') DEFAULT NULL,
  `activos_juego_id` varchar(36) NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_historial_estados_activo_activos_juego1_idx` (`activos_juego_id`),
  KEY `fk_historial_estados_activo_usuarios1_idx` (`usuarios_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `jugadores` (
  `id` varchar(36) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `creado_en` datetime DEFAULT NULL,
  `mesas_id` varchar(36) NOT NULL,
  `pedido_id` varchar(36) DEFAULT NULL,
  `clientes_id` varchar(36) DEFAULT NULL,
  `tipo_participante` enum('registrado','temporal') DEFAULT NULL,
  `alias_temporal` varchar(100) GENERATED ALWAYS AS (case when `tipo_participante` = 'temporal' then lcase(trim(`nombre`)) else NULL end) STORED,
  `sesion_mesa_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_participante_cliente` (`pedido_id`,`clientes_id`),
  UNIQUE KEY `uq_participante_sesion_cliente` (`sesion_mesa_id`,`clientes_id`),
  KEY `fk_jugadores_mesas1_idx` (`mesas_id`),
  KEY `fk_participante_cliente` (`clientes_id`),
  CONSTRAINT `chk_participante_identidad` CHECK (`pedido_id` is null or `tipo_participante` is not null and `nombre` is not null and char_length(trim(`nombre`)) > 0 and (`tipo_participante` = 'registrado' and `clientes_id` is not null or `tipo_participante` = 'temporal' and `clientes_id` is null)),
  CONSTRAINT `chk_participante_sesion_identidad` CHECK (`sesion_mesa_id` is null or `tipo_participante` is not null and `nombre` is not null and char_length(trim(`nombre`)) > 0 and (`tipo_participante` = 'registrado' and `clientes_id` is not null or `tipo_participante` = 'temporal' and `clientes_id` is null))
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `kanban_movimientos` (
  `id` varchar(36) NOT NULL,
  `estado_anterior` enum('enviado','servido','preparando','cancelado') NOT NULL,
  `creado_en` datetime NOT NULL,
  `pedido_items_id` varchar(36) NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_kanban_movimientos_pedido_items1_idx` (`pedido_items_id`),
  KEY `fk_kanban_movimientos_usuarios1_idx` (`usuarios_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `merma_motivos` (
  `id` varchar(36) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre_UNIQUE` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `mermas` (
  `id` varchar(36) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `valor_economico` decimal(10,2) NOT NULL,
  `creado_en` datetime NOT NULL,
  `productos_id` varchar(36) NOT NULL,
  `merma_motivos_id` varchar(36) NOT NULL,
  `refrigeradores_id` varchar(36) NOT NULL,
  `movimientos_inventario_id` varchar(36) NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_mermas_productos1_idx` (`productos_id`),
  KEY `fk_mermas_merma_motivos1_idx` (`merma_motivos_id`),
  KEY `fk_mermas_refrigeradores1_idx` (`refrigeradores_id`),
  KEY `fk_mermas_movimientos_inventario1_idx` (`movimientos_inventario_id`),
  KEY `fk_mermas_usuarios1_idx` (`usuarios_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `mesas` (
  `id` varchar(36) NOT NULL,
  `numero` int(11) NOT NULL,
  `estado` enum('disponible','ocupada','en_cobro') NOT NULL,
  `codigo_qr` varchar(100) DEFAULT NULL,
  `creado_en` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_qr_UNIQUE` (`codigo_qr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `movimientos_inventario` (
  `id` varchar(36) NOT NULL,
  `tipo` enum('compra','venta','merma','ajuste') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `stock_antes` int(11) NOT NULL,
  `stock_despues` int(11) NOT NULL,
  `referencia_tipo` enum('pedido','compra','merma','ajuste') NOT NULL,
  `productos_id` varchar(36) NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  `creado_en` datetime DEFAULT NULL,
  `referencia_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_movimientos_inventario_productos1_idx` (`productos_id`),
  KEY `fk_movimientos_inventario_usuarios1_idx` (`usuarios_id`),
  KEY `idx_movimientos_fecha_id` (`creado_en`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `otp_tokens` (
  `id` int(11) NOT NULL,
  `codigo` varchar(8) NOT NULL,
  `expira_en` datetime NOT NULL,
  `usado` tinyint(4) DEFAULT NULL,
  `creado_en` datetime NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_otp_tokens_usuarios1_idx` (`usuarios_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `pagos` (
  `id` varchar(20) NOT NULL,
  `metodo_de_pago` enum('efectivo','nequi','daviplata','tarjeta') NOT NULL,
  `total_seleccionado` decimal(12,2) NOT NULL,
  `verificacion_estado` enum('pendiente','verificado','rechazado') NOT NULL,
  `estado` enum('pendiente','pagado','cancelado') DEFAULT NULL,
  `origen` enum('mesera','cliente_web') DEFAULT NULL,
  `creado_en` datetime NOT NULL,
  `pedidos_id` varchar(36) NOT NULL,
  `sesion_division_id` varchar(36) DEFAULT NULL,
  `participante_id` varchar(36) DEFAULT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  `verificado_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pagos_pedidos1_idx` (`pedidos_id`),
  KEY `fk_pagos_usuarios1_idx` (`usuarios_id`),
  KEY `idx_pagos_estado_verificacion_fecha` (`estado`,`verificacion_estado`,`verificado_en`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `pausas_sesion` (
  `id` varchar(36) NOT NULL,
  `inicio_pausa` datetime NOT NULL,
  `fin_pausa` datetime NOT NULL,
  `motivo` varchar(200) DEFAULT NULL,
  `sesiones_juego_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pausas_sesion_sesiones_juego1_idx` (`sesiones_juego_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `pedido_items` (
  `id` varchar(36) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `pedido_id` varchar(36) NOT NULL,
  `producto_id` varchar(36) NOT NULL,
  `cantidad_pedida` int(11) NOT NULL,
  `cantidad_pagada` int(11) DEFAULT NULL,
  `estado` enum('enviado','servido','preparando','cancelado') NOT NULL,
  `pedidos_id` varchar(36) NOT NULL,
  `productos_id` varchar(36) NOT NULL,
  `participante_id` varchar(36) DEFAULT NULL,
  `ronda_consumo_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pedido_items_pedidos1_idx` (`pedidos_id`),
  KEY `fk_pedido_items_productos1_idx` (`productos_id`),
  KEY `idx_item_participante` (`participante_id`),
  KEY `idx_item_ronda` (`ronda_consumo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `pedidos` (
  `id` varchar(36) NOT NULL,
  `estado` enum('abierto','cerrado','cancelado') NOT NULL,
  `total_productos` decimal(10,2) DEFAULT 0.00,
  `total_juegos` decimal(10,2) DEFAULT 0.00,
  `total_general` decimal(10,2) DEFAULT 0.00,
  `sincronizado` tinyint(4) DEFAULT NULL,
  `creado_en` datetime NOT NULL,
  `mesas_id` varchar(36) NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  `clientes_id` varchar(36) DEFAULT NULL,
  `sesion_mesa_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_pedidos_mesas1_idx` (`mesas_id`),
  KEY `fk_pedidos_usuarios1_idx` (`usuarios_id`),
  KEY `fk_pedidos_clientes1_idx` (`clientes_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_fecha` (`creado_en`),
  KEY `idx_pedido_sesion_mesa` (`sesion_mesa_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `productos` (
  `id` varchar(36) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `precio_venta` decimal(10,2) NOT NULL,
  `costo_promedio_ponderado` decimal(10,2) NOT NULL,
  `cantidad_disponible` int(11) NOT NULL,
  `stock_minimo` int(11) NOT NULL,
  `estado` enum('activo','inactivo') NOT NULL,
  `categorias_id` int(11) NOT NULL,
  `proveedores_id` varchar(36) NOT NULL,
  `historial_costos_id` varchar(36) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 10,
  `version_inventario` bigint(20) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_UNIQUE` (`codigo`),
  KEY `fk_productos_categorias1_idx` (`categorias_id`),
  KEY `fk_productos_proveedores1_idx` (`proveedores_id`),
  KEY `fk_productos_historial_costos1_idx` (`historial_costos_id`),
  KEY `idx_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `proveedores` (
  `id` varchar(36) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `contacto_nombre` varchar(100) DEFAULT NULL,
  `estado` enum('activo','inactivo') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `recepcion_compra_items` (
  `id` varchar(36) NOT NULL,
  `recepciones_compra_id` varchar(36) NOT NULL,
  `compra_items_id` varchar(36) NOT NULL,
  `productos_id` varchar(36) NOT NULL,
  `cantidad_recibida` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `movimiento_entrada_id` varchar(36) NOT NULL,
  `movimiento_reverso_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_recepcion_item` (`recepciones_compra_id`,`compra_items_id`),
  UNIQUE KEY `uq_recepcion_entrada` (`movimiento_entrada_id`),
  UNIQUE KEY `uq_recepcion_reverso` (`movimiento_reverso_id`),
  KEY `fk_recepcion_item_compra` (`compra_items_id`),
  KEY `fk_recepcion_item_producto` (`productos_id`),
  CONSTRAINT `chk_recepcion_item_cantidad` CHECK (`cantidad_recibida` > 0 and `precio_unitario` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `recepciones_compra` (
  `id` varchar(36) NOT NULL,
  `compras_id` varchar(36) NOT NULL,
  `estado` enum('confirmada','reversada') NOT NULL,
  `recibida_por` varchar(36) NOT NULL,
  `recibida_en` datetime NOT NULL,
  `clave_idempotencia` varchar(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `reversada_por` varchar(36) DEFAULT NULL,
  `reversada_en` datetime DEFAULT NULL,
  `motivo_reverso` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_recepcion_idempotencia` (`compras_id`,`clave_idempotencia`),
  KEY `idx_recepcion_compra_fecha` (`compras_id`,`recibida_en`,`id`),
  KEY `idx_recepcion_receptor_fecha` (`recibida_por`,`recibida_en`),
  KEY `fk_recepcion_reversor` (`reversada_por`),
  CONSTRAINT `chk_recepcion_reverso` CHECK (`estado` = 'confirmada' and `reversada_por` is null and `reversada_en` is null and `motivo_reverso` is null or `estado` = 'reversada' and `reversada_por` is not null and `reversada_en` is not null and `motivo_reverso` is not null and char_length(trim(`motivo_reverso`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `refrigerador_stock` (
  `id` varchar(36) NOT NULL,
  `cantidad_disponible` int(11) NOT NULL,
  `cantidad_minima` int(11) NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `refrigeradores_id` varchar(36) NOT NULL,
  `productos_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_refrigerador_stock_refrigeradores1_idx` (`refrigeradores_id`),
  KEY `fk_refrigerador_stock_productos1_idx` (`productos_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `refrigeradores` (
  `id` varchar(36) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `ubicacion` varchar(45) DEFAULT NULL,
  `estado` enum('activa','mantenimiento','apagada') NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `reportes_generados` (
  `id` varchar(36) NOT NULL,
  `tipo` enum('diario','mensual','anual') NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `datos_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_json`)),
  `archivo_url` varchar(500) DEFAULT NULL,
  `creado_en` datetime NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_reportes_generados_usuarios1_idx` (`usuarios_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `activo` tinyint(4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre_UNIQUE` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `ronda_jugadores` (
  `id` varchar(36) NOT NULL,
  `pareja` enum('a','b') DEFAULT NULL,
  `es_perdedor` tinyint(4) DEFAULT NULL,
  `rondas_id` varchar(36) NOT NULL,
  `jugadores_id` varchar(36) NOT NULL,
  `pedido_items_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ronda_jugadores_rondas1_idx` (`rondas_id`),
  KEY `fk_ronda_jugadores_jugadores1_idx` (`jugadores_id`),
  KEY `fk_ronda_jugadores_pedido_items1_idx` (`pedido_items_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `rondas` (
  `id` varchar(36) NOT NULL,
  `numero_ronda` int(11) NOT NULL,
  `resultado` enum('pareja_a','pareja_b') DEFAULT NULL,
  `estado` enum('activa','finalizada') NOT NULL,
  `consumo_asignado` tinyint(4) DEFAULT NULL,
  `sesiones_juego_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_rondas_sesiones_juego1_idx` (`sesiones_juego_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `rondas_consumo` (
  `id` varchar(36) NOT NULL,
  `pedido_id` varchar(36) NOT NULL,
  `numero_ronda` int(10) unsigned NOT NULL,
  `estado` enum('confirmada','cancelada') NOT NULL DEFAULT 'confirmada',
  `creada_en` datetime NOT NULL,
  `creada_por` varchar(36) NOT NULL,
  `idempotencia_clave` varchar(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `solicitud_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ronda_numero` (`pedido_id`,`numero_ronda`),
  UNIQUE KEY `uq_ronda_idempotencia` (`pedido_id`,`idempotencia_clave`),
  KEY `idx_ronda_pedido` (`pedido_id`),
  KEY `fk_ronda_actor` (`creada_por`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `sesiones_activas` (
  `id` int(11) NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT current_timestamp(),
  `token_jwt` varchar(512) NOT NULL,
  `dispositivo` varchar(255) DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `expira_en` datetime DEFAULT NULL,
  `activa` tinyint(4) DEFAULT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sesiones_activas_usuarios1_idx` (`usuarios_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `sesiones_division` (
  `id` varchar(36) NOT NULL,
  `modalidad` enum('por_items','equitativa','total') NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  `mesas_id` varchar(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sesiones_division_usuarios1_idx` (`usuarios_id`),
  KEY `fk_sesiones_division_mesas1_idx` (`mesas_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `sesiones_division_cuentas` (
  `id` varchar(36) NOT NULL,
  `modalidad` enum('items','equitativa','total','personalizada') NOT NULL,
  `usuarios_id` varchar(36) NOT NULL,
  `mesas_id` varchar(36) NOT NULL,
  `creado_en` datetime DEFAULT current_timestamp(),
  `sesion_mesa_id` varchar(36) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `estado` enum('activa','completada','cancelada') NOT NULL DEFAULT 'activa',
  `completada_en` datetime DEFAULT NULL,
  `cancelada_en` datetime DEFAULT NULL,
  `pedido_id` varchar(36) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `total_objetivo` decimal(12,2) DEFAULT NULL,
  `total_cuenta_base` decimal(12,2) DEFAULT NULL,
  `cuotas_clave` varchar(128) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `cuotas_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `cuentas_items_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (`cuentas_items_json` is null or json_valid(`cuentas_items_json`)),
  PRIMARY KEY (`id`),
  KEY `idx_sesiones_div_usuarios` (`usuarios_id`),
  KEY `idx_sesiones_div_mesas` (`mesas_id`),
  KEY `idx_division_visita` (`sesion_mesa_id`),
  KEY `idx_division_estado_mesa` (`mesas_id`,`estado`),
  KEY `idx_division_pedido` (`pedido_id`),
  CONSTRAINT `chk_division_ciclo` CHECK (`estado` = 'activa' and `completada_en` is null and `cancelada_en` is null or `estado` = 'completada' and `completada_en` is not null and `cancelada_en` is null or `estado` = 'cancelada' and `cancelada_en` is not null and `completada_en` is null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `sesiones_juego` (
  `id` varchar(36) NOT NULL,
  `tipo_juego` enum('tejo','billar','juego') NOT NULL,
  `costo_total` decimal(10,2) DEFAULT NULL,
  `estado` enum('activa','cerrada','cancelada') NOT NULL,
  `activos_juego_id` varchar(36) NOT NULL,
  `mesas_id` varchar(36) NOT NULL,
  `iniciada_por` varchar(36) NOT NULL,
  `cerrada_por` varchar(36) DEFAULT NULL,
  `pedido_items_id` varchar(36) DEFAULT NULL,
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `tarifa_hora_aplicada` decimal(10,2) DEFAULT NULL,
  `pedidos_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sesiones_juego_activos_juego1_idx` (`activos_juego_id`),
  KEY `fk_sesiones_juego_mesas1_idx` (`mesas_id`),
  KEY `fk_sesiones_juego_usuarios1_idx` (`iniciada_por`),
  KEY `fk_sesiones_juego_usuarios2_idx` (`cerrada_por`),
  KEY `fk_sesiones_juego_pedido_items1_idx` (`pedido_items_id`),
  KEY `idx_sesiones_activo_estado` (`activos_juego_id`,`estado`),
  KEY `idx_sesiones_mesa_estado` (`mesas_id`,`estado`),
  KEY `idx_sesiones_estado_inicio` (`estado`,`fecha_inicio`,`id`),
  KEY `idx_sesion_juego_pedido` (`pedidos_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `sesiones_mesa` (
  `id` varchar(36) NOT NULL,
  `mesas_id` varchar(36) NOT NULL,
  `estado` enum('activa','cerrada') NOT NULL DEFAULT 'activa',
  `iniciada_en` datetime NOT NULL,
  `cerrada_en` datetime DEFAULT NULL,
  `mesa_activa` varchar(36) GENERATED ALWAYS AS (case when `estado` = 'activa' then `mesas_id` else NULL end) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sesion_mesa_activa` (`mesa_activa`),
  KEY `idx_sesion_mesa_fecha` (`mesas_id`,`iniciada_en`,`id`),
  CONSTRAINT `chk_sesion_mesa_cierre` CHECK (`estado` = 'activa' and `cerrada_en` is null or `estado` = 'cerrada' and `cerrada_en` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `usuarios` (
  `id` varchar(36) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `estado` enum('activo','inactivo','bloqueado') DEFAULT NULL,
  `intentos_fallidos` tinyint(4) DEFAULT NULL,
  `ultimo_intento` datetime DEFAULT NULL,
  `bloqueado_hasta` datetime DEFAULT NULL,
  `requiere_cambio_pwd` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_acceso` datetime DEFAULT NULL,
  `roles_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_UNIQUE` (`email`),
  KEY `fk_usuarios_roles_idx` (`roles_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Claves foraneas verificadas con todas las tablas disponibles.
ALTER TABLE `alertas_inventario` ADD CONSTRAINT `fk_alerta_resolucion_usuario` FOREIGN KEY (`resuelta_por`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;
ALTER TABLE `alertas_inventario` ADD CONSTRAINT `fk_alerta_silencio_usuario` FOREIGN KEY (`silenciada_por`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;
ALTER TABLE `alertas_inventario` ADD CONSTRAINT `fk_alerta_vista_usuario` FOREIGN KEY (`vista_por`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;
ALTER TABLE `alertas_inventario` ADD CONSTRAINT `fk_alertas_inventario_productos1` FOREIGN KEY (`productos_id`) REFERENCES `productos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `alertas_inventario_historial` ADD CONSTRAINT `fk_alerta_historial_episodio` FOREIGN KEY (`alertas_inventario_id`) REFERENCES `alertas_inventario` (`id`) ON UPDATE CASCADE;
ALTER TABLE `alertas_inventario_historial` ADD CONSTRAINT `fk_alerta_historial_usuario` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;
ALTER TABLE `auditoria` ADD CONSTRAINT `fk_auditoria_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;
ALTER TABLE `cierre_pagos` ADD CONSTRAINT `fk_cierre_pagos_cierre` FOREIGN KEY (`cierres_caja_id`) REFERENCES `cierres_caja` (`id`) ON UPDATE CASCADE;
ALTER TABLE `cierre_pagos` ADD CONSTRAINT `fk_cierre_pagos_pago` FOREIGN KEY (`pagos_id`) REFERENCES `pagos` (`id`) ON UPDATE CASCADE;
ALTER TABLE `cierres_caja` ADD CONSTRAINT `fk_cierres_caja_reportes_generados1` FOREIGN KEY (`reportes_generados_id`) REFERENCES `reportes_generados` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `cierres_caja` ADD CONSTRAINT `fk_cierres_caja_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `clientes` ADD CONSTRAINT `fk_clientes_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE `compra_items` ADD CONSTRAINT `fk_compra_items_compras1` FOREIGN KEY (`compras_id`) REFERENCES `compras` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `compra_items` ADD CONSTRAINT `fk_compra_items_productos1` FOREIGN KEY (`productos_id`) REFERENCES `productos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `compras` ADD CONSTRAINT `fk_compras_proveedores1` FOREIGN KEY (`proveedores_id`) REFERENCES `proveedores` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `compras` ADD CONSTRAINT `fk_compras_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `comprobante_items` ADD CONSTRAINT `fk_comprobante_items_comprobante` FOREIGN KEY (`comprobantes_id`) REFERENCES `comprobantes` (`id`) ON UPDATE CASCADE;
ALTER TABLE `comprobantes` ADD CONSTRAINT `fk_comprobantes_cliente` FOREIGN KEY (`clientes_id`) REFERENCES `clientes` (`id`) ON UPDATE CASCADE;
ALTER TABLE `comprobantes` ADD CONSTRAINT `fk_comprobantes_pedido` FOREIGN KEY (`pedidos_id`) REFERENCES `pedidos` (`id`) ON UPDATE CASCADE;
ALTER TABLE `comprobantes` ADD CONSTRAINT `fk_comprobantes_usuario` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;
ALTER TABLE `configuracion_negocio` ADD CONSTRAINT `fk_configuracion_usuario` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;
ALTER TABLE `conflictos_sincronizacion` ADD CONSTRAINT `fk_conflictos_sincronizacion_cola_eventos_offline1` FOREIGN KEY (`cola_eventos_offline_id`) REFERENCES `cola_eventos_offline` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `conflictos_sincronizacion` ADD CONSTRAINT `fk_conflictos_sincronizacion_dispositivos1` FOREIGN KEY (`dispositivos_id`) REFERENCES `dispositivos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `conflictos_sincronizacion` ADD CONSTRAINT `fk_conflictos_sincronizacion_usuarios1` FOREIGN KEY (`resuelto_por`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `division_participantes` ADD CONSTRAINT `fk_division_pagador` FOREIGN KEY (`jugadores_id`) REFERENCES `jugadores` (`id`) ON UPDATE CASCADE;
ALTER TABLE `historial_cambios_mesa` ADD CONSTRAINT `fk_historial_cambios_mesa_mesas1` FOREIGN KEY (`mesas_id`) REFERENCES `mesas` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `historial_cambios_mesa` ADD CONSTRAINT `fk_historial_cambios_mesa_mesas2` FOREIGN KEY (`mesas_id1`) REFERENCES `mesas` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `historial_cambios_mesa` ADD CONSTRAINT `fk_historial_cambios_mesa_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `historial_costos` ADD CONSTRAINT `fk_historial_costos_compras1` FOREIGN KEY (`compras_id`) REFERENCES `compras` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `historial_costos_recepciones` ADD CONSTRAINT `fk_historial_recepcion_compra` FOREIGN KEY (`compras_id`) REFERENCES `compras` (`id`) ON UPDATE CASCADE;
ALTER TABLE `historial_costos_recepciones` ADD CONSTRAINT `fk_historial_recepcion_linea` FOREIGN KEY (`recepcion_compra_items_id`) REFERENCES `recepcion_compra_items` (`id`) ON UPDATE CASCADE;
ALTER TABLE `historial_costos_recepciones` ADD CONSTRAINT `fk_historial_recepcion_producto` FOREIGN KEY (`productos_id`) REFERENCES `productos` (`id`) ON UPDATE CASCADE;
ALTER TABLE `historial_costos_recepciones` ADD CONSTRAINT `fk_historial_recepcion_usuario` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;
ALTER TABLE `historial_estados_activo` ADD CONSTRAINT `fk_historial_estados_activo_activos_juego1` FOREIGN KEY (`activos_juego_id`) REFERENCES `activos_juego` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `historial_estados_activo` ADD CONSTRAINT `fk_historial_estados_activo_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `jugadores` ADD CONSTRAINT `fk_jugador_sesion_mesa` FOREIGN KEY (`sesion_mesa_id`) REFERENCES `sesiones_mesa` (`id`) ON UPDATE CASCADE;
ALTER TABLE `jugadores` ADD CONSTRAINT `fk_jugadores_mesas1` FOREIGN KEY (`mesas_id`) REFERENCES `mesas` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `jugadores` ADD CONSTRAINT `fk_participante_cliente` FOREIGN KEY (`clientes_id`) REFERENCES `clientes` (`id`) ON UPDATE CASCADE;
ALTER TABLE `jugadores` ADD CONSTRAINT `fk_participante_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON UPDATE CASCADE;
ALTER TABLE `kanban_movimientos` ADD CONSTRAINT `fk_kanban_movimientos_pedido_items1` FOREIGN KEY (`pedido_items_id`) REFERENCES `pedido_items` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `kanban_movimientos` ADD CONSTRAINT `fk_kanban_movimientos_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `mermas` ADD CONSTRAINT `fk_mermas_merma_motivos1` FOREIGN KEY (`merma_motivos_id`) REFERENCES `merma_motivos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `mermas` ADD CONSTRAINT `fk_mermas_movimientos_inventario1` FOREIGN KEY (`movimientos_inventario_id`) REFERENCES `movimientos_inventario` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `mermas` ADD CONSTRAINT `fk_mermas_productos1` FOREIGN KEY (`productos_id`) REFERENCES `productos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `mermas` ADD CONSTRAINT `fk_mermas_refrigeradores1` FOREIGN KEY (`refrigeradores_id`) REFERENCES `refrigeradores` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `mermas` ADD CONSTRAINT `fk_mermas_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `fk_movimientos_inventario_productos1` FOREIGN KEY (`productos_id`) REFERENCES `productos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `movimientos_inventario` ADD CONSTRAINT `fk_movimientos_inventario_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `otp_tokens` ADD CONSTRAINT `fk_otp_tokens_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `pagos` ADD CONSTRAINT `fk_pagos_pedidos1` FOREIGN KEY (`pedidos_id`) REFERENCES `pedidos` (`id`) ON UPDATE CASCADE;
ALTER TABLE `pagos` ADD CONSTRAINT `fk_pagos_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `pausas_sesion` ADD CONSTRAINT `fk_pausas_sesion_sesiones_juego1` FOREIGN KEY (`sesiones_juego_id`) REFERENCES `sesiones_juego` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `pedido_items` ADD CONSTRAINT `fk_item_participante` FOREIGN KEY (`participante_id`) REFERENCES `jugadores` (`id`) ON UPDATE CASCADE;
ALTER TABLE `pedido_items` ADD CONSTRAINT `fk_item_ronda_consumo` FOREIGN KEY (`ronda_consumo_id`) REFERENCES `rondas_consumo` (`id`) ON UPDATE CASCADE;
ALTER TABLE `pedido_items` ADD CONSTRAINT `fk_pedido_items_pedidos1` FOREIGN KEY (`pedidos_id`) REFERENCES `pedidos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `pedido_items` ADD CONSTRAINT `fk_pedido_items_productos1` FOREIGN KEY (`productos_id`) REFERENCES `productos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `pedidos` ADD CONSTRAINT `fk_pedido_sesion_mesa` FOREIGN KEY (`sesion_mesa_id`) REFERENCES `sesiones_mesa` (`id`) ON UPDATE CASCADE;
ALTER TABLE `pedidos` ADD CONSTRAINT `fk_pedidos_clientes1` FOREIGN KEY (`clientes_id`) REFERENCES `clientes` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `pedidos` ADD CONSTRAINT `fk_pedidos_mesas1` FOREIGN KEY (`mesas_id`) REFERENCES `mesas` (`id`) ON UPDATE CASCADE;
ALTER TABLE `pedidos` ADD CONSTRAINT `fk_pedidos_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `productos` ADD CONSTRAINT `fk_productos_categorias1` FOREIGN KEY (`categorias_id`) REFERENCES `categorias` (`id`) ON UPDATE CASCADE;
ALTER TABLE `productos` ADD CONSTRAINT `fk_productos_historial_costos1` FOREIGN KEY (`historial_costos_id`) REFERENCES `historial_costos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `productos` ADD CONSTRAINT `fk_productos_proveedores1` FOREIGN KEY (`proveedores_id`) REFERENCES `proveedores` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `recepcion_compra_items` ADD CONSTRAINT `fk_recepcion_item_cabecera` FOREIGN KEY (`recepciones_compra_id`) REFERENCES `recepciones_compra` (`id`) ON UPDATE CASCADE;
ALTER TABLE `recepcion_compra_items` ADD CONSTRAINT `fk_recepcion_item_compra` FOREIGN KEY (`compra_items_id`) REFERENCES `compra_items` (`id`) ON UPDATE CASCADE;
ALTER TABLE `recepcion_compra_items` ADD CONSTRAINT `fk_recepcion_item_entrada` FOREIGN KEY (`movimiento_entrada_id`) REFERENCES `movimientos_inventario` (`id`) ON UPDATE CASCADE;
ALTER TABLE `recepcion_compra_items` ADD CONSTRAINT `fk_recepcion_item_producto` FOREIGN KEY (`productos_id`) REFERENCES `productos` (`id`) ON UPDATE CASCADE;
ALTER TABLE `recepcion_compra_items` ADD CONSTRAINT `fk_recepcion_item_reverso` FOREIGN KEY (`movimiento_reverso_id`) REFERENCES `movimientos_inventario` (`id`) ON UPDATE CASCADE;
ALTER TABLE `recepciones_compra` ADD CONSTRAINT `fk_recepcion_compra` FOREIGN KEY (`compras_id`) REFERENCES `compras` (`id`) ON UPDATE CASCADE;
ALTER TABLE `recepciones_compra` ADD CONSTRAINT `fk_recepcion_receptor` FOREIGN KEY (`recibida_por`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;
ALTER TABLE `recepciones_compra` ADD CONSTRAINT `fk_recepcion_reversor` FOREIGN KEY (`reversada_por`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;
ALTER TABLE `refrigerador_stock` ADD CONSTRAINT `fk_refrigerador_stock_productos1` FOREIGN KEY (`productos_id`) REFERENCES `productos` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `refrigerador_stock` ADD CONSTRAINT `fk_refrigerador_stock_refrigeradores1` FOREIGN KEY (`refrigeradores_id`) REFERENCES `refrigeradores` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `reportes_generados` ADD CONSTRAINT `fk_reportes_generados_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `ronda_jugadores` ADD CONSTRAINT `fk_ronda_jugadores_jugadores1` FOREIGN KEY (`jugadores_id`) REFERENCES `jugadores` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `ronda_jugadores` ADD CONSTRAINT `fk_ronda_jugadores_pedido_items1` FOREIGN KEY (`pedido_items_id`) REFERENCES `pedido_items` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `ronda_jugadores` ADD CONSTRAINT `fk_ronda_jugadores_rondas1` FOREIGN KEY (`rondas_id`) REFERENCES `rondas` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `rondas` ADD CONSTRAINT `fk_rondas_sesiones_juego1` FOREIGN KEY (`sesiones_juego_id`) REFERENCES `sesiones_juego` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `rondas_consumo` ADD CONSTRAINT `fk_ronda_actor` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE;
ALTER TABLE `rondas_consumo` ADD CONSTRAINT `fk_ronda_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON UPDATE CASCADE;
ALTER TABLE `sesiones_activas` ADD CONSTRAINT `fk_sesiones_activas_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `sesiones_division` ADD CONSTRAINT `fk_sesiones_division_mesas1` FOREIGN KEY (`mesas_id`) REFERENCES `mesas` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `sesiones_division` ADD CONSTRAINT `fk_sesiones_division_usuarios1` FOREIGN KEY (`usuarios_id`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `sesiones_division_cuentas` ADD CONSTRAINT `fk_division_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON UPDATE CASCADE;
ALTER TABLE `sesiones_division_cuentas` ADD CONSTRAINT `fk_division_visita` FOREIGN KEY (`sesion_mesa_id`) REFERENCES `sesiones_mesa` (`id`) ON UPDATE CASCADE;
ALTER TABLE `sesiones_juego` ADD CONSTRAINT `fk_sesion_juego_pedido` FOREIGN KEY (`pedidos_id`) REFERENCES `pedidos` (`id`) ON UPDATE CASCADE;
ALTER TABLE `sesiones_juego` ADD CONSTRAINT `fk_sesiones_juego_activos_juego1` FOREIGN KEY (`activos_juego_id`) REFERENCES `activos_juego` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `sesiones_juego` ADD CONSTRAINT `fk_sesiones_juego_mesas1` FOREIGN KEY (`mesas_id`) REFERENCES `mesas` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `sesiones_juego` ADD CONSTRAINT `fk_sesiones_juego_pedido_items1` FOREIGN KEY (`pedido_items_id`) REFERENCES `pedido_items` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `sesiones_juego` ADD CONSTRAINT `fk_sesiones_juego_usuarios1` FOREIGN KEY (`iniciada_por`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `sesiones_juego` ADD CONSTRAINT `fk_sesiones_juego_usuarios2` FOREIGN KEY (`cerrada_por`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `sesiones_mesa` ADD CONSTRAINT `fk_sesion_mesa` FOREIGN KEY (`mesas_id`) REFERENCES `mesas` (`id`) ON UPDATE CASCADE;
ALTER TABLE `usuarios` ADD CONSTRAINT `fk_usuarios_roles` FOREIGN KEY (`roles_id`) REFERENCES `roles` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

DELIMITER $$
CREATE PROCEDURE `sincronizar_alerta_inventario`(IN p_producto VARCHAR(36),IN p_stock INT,IN p_minimo INT)
BEGIN
 DECLARE v_id VARCHAR(36) DEFAULT NULL;
 DECLARE v_tipo VARCHAR(10);
 DECLARE v_estado VARCHAR(12);
 DECLARE v_stock INT;
 DECLARE v_minimo INT;
 DECLARE v_nuevo_tipo VARCHAR(10);
 DECLARE v_evento VARCHAR(45);
 DECLARE v_fecha DATETIME;
 DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_id=NULL;
 SET v_fecha=UTC_TIMESTAMP();
 SELECT id,tipo,estado,stock_observado,stock_minimo INTO v_id,v_tipo,v_estado,v_stock,v_minimo
 FROM alertas_inventario WHERE producto_abierto=p_producto FOR UPDATE;
 IF p_stock<=p_minimo THEN
   SET v_nuevo_tipo=IF(p_stock<=0,'agotado','bajo');
   IF v_id IS NULL THEN
     SET v_id=UUID();
     INSERT INTO alertas_inventario(id,tipo,estado,creado_en,productos_id,modelo_episodio,stock_observado,stock_minimo,actualizado_en)
     VALUES(v_id,v_nuevo_tipo,'activa',v_fecha,p_producto,'v2',p_stock,p_minimo,v_fecha);
     INSERT INTO alertas_inventario_historial(id,alertas_inventario_id,evento,origen,usuarios_id,cambios_json,creado_en)
     VALUES(UUID(),v_id,'alerta_creada','automatico',NULL,JSON_OBJECT('tipo',v_nuevo_tipo,'estado','activa','stock',p_stock,'stock_minimo',p_minimo),v_fecha);
   ELSEIF NOT(v_stock<=>p_stock) OR NOT(v_minimo<=>p_minimo) OR v_tipo<>v_nuevo_tipo THEN
     SET v_evento=IF(v_tipo<>v_nuevo_tipo,'cambio_condicion','stock_observado');
     UPDATE alertas_inventario SET tipo=v_nuevo_tipo,stock_observado=p_stock,stock_minimo=p_minimo,actualizado_en=v_fecha WHERE id=v_id;
     INSERT INTO alertas_inventario_historial(id,alertas_inventario_id,evento,origen,usuarios_id,cambios_json,creado_en)
     VALUES(UUID(),v_id,v_evento,'automatico',NULL,JSON_OBJECT('tipo_anterior',v_tipo,'tipo',v_nuevo_tipo,'estado',v_estado,'stock_anterior',v_stock,'stock',p_stock,'stock_minimo_anterior',v_minimo,'stock_minimo',p_minimo),v_fecha);
   END IF;
 ELSEIF v_id IS NOT NULL THEN
   UPDATE alertas_inventario SET estado='resuelta',stock_observado=p_stock,stock_minimo=p_minimo,actualizado_en=v_fecha,resuelto_en=v_fecha,resuelta_por=NULL WHERE id=v_id;
   INSERT INTO alertas_inventario_historial(id,alertas_inventario_id,evento,origen,usuarios_id,cambios_json,creado_en)
   VALUES(UUID(),v_id,'alerta_resuelta_automaticamente','automatico',NULL,JSON_OBJECT('estado_anterior',v_estado,'estado','resuelta','tipo',v_tipo,'stock_anterior',v_stock,'stock',p_stock,'stock_minimo',p_minimo),v_fecha);
 END IF;
END$$
CREATE TRIGGER trg_producto_alerta_insert AFTER INSERT ON productos
FOR EACH ROW CALL sincronizar_alerta_inventario(NEW.id,NEW.cantidad_disponible,NEW.stock_minimo)$$
CREATE TRIGGER trg_producto_alerta_update AFTER UPDATE ON productos
FOR EACH ROW CALL sincronizar_alerta_inventario(NEW.id,NEW.cantidad_disponible,NEW.stock_minimo)$$
CREATE TRIGGER trg_productos_version_inventario BEFORE UPDATE ON productos
FOR EACH ROW
BEGIN
 IF NOT (NEW.cantidad_disponible <=> OLD.cantidad_disponible)
    OR NOT (NEW.costo_promedio_ponderado <=> OLD.costo_promedio_ponderado) THEN
   IF OLD.version_inventario = 18446744073709551615 THEN
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Version de inventario agotada';
   END IF;
   SET NEW.version_inventario = OLD.version_inventario + 1;
 ELSE
   SET NEW.version_inventario = OLD.version_inventario;
 END IF;
END$$
DELIMITER ;

-- Unicamente catalogos del sistema; sin usuarios ni datos de ejemplo.
INSERT INTO roles(nombre,activo) VALUES ('Administrador',1),('SuperAdmin',1),('Mesero',1),('Mesera',1),('Bartender',1),('Cajero',1);
INSERT INTO configuracion_negocio(id) VALUES(1);
