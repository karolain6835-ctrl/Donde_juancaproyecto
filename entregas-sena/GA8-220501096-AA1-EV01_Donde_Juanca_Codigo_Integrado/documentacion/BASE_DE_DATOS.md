# Base de datos

Motor del manifiesto: MariaDB 10.4.32. El instalador rechaza MySQL; la compatibilidad con MySQL 8 está pendiente. No se ejecutó SQL durante la preparación.

Instalación nueva, exclusivamente en una base vacía:
1. v2.45_instalacion_limpia_v1.sql
2. v2.46_recuperacion_password_segura.sql
3. v2.47_productos_imagen_opcional.sql

La baseline crea estructura y roles, no usuarios ni filas de negocio. v2.47 agrega imágenes opcionales. No ejecutar v1.0–v2.44 después de la baseline. Los históricos contienen ALTER y semillas dependientes de estados anteriores: no constituyen una cadena certificada para instalar desde cero. v2.21 es una plantilla parametrizada, no se importa directamente. Las versiones v1.8 y v2.7 existen con nombres irregulares y se conservaron: `V1.8_Asegurar integridad en transacciones críticas` (sin extensión) y `v2.7_modulo_kanban.sql)` (paréntesis final). En el histórico se ubican entre v1.7/v1.9 y v2.6/v2.8 respectivamente. No renombrarlas: el manifiesto referencia sus nombres actuales.

Inventario histórico en orden numérico (no orden lexicográfico):
- v1.0_estructura.sql
- v1.1_semillas.sql
- v1.2_agregar_icono_categorias.sql
- v1.3_modificar_tipo_dato_icono.sql
- v1.4_agregar_restriccion_descripcion.sql
- v1.5_eliminar_restriccion_descripcion.sql
- v1.6_definir_politicas_referenciales.sql
- v1.7_actualizar_politicas_update.sql
- v1.9_gestion_api_mesas_productos.sql
- v2.0_gestion_api_pagos_cierres.sql
- v2.1_gestion_api_juegos.sql
- v2.2_gestion_alertas_inventario.sql
- v2.3_gestion_clientes.sql
- v2.4_gestion_ventas_facturacion.sql
- v2.5_gestion_usuarios_seguridad.sql
- v2.6_datos_maestros.sql
- v2.8_registros_iniciales_parametrizacion.sql
- v2.9_actualizacion_seguridad_usuarios.sql
- v2.10_actualizacion_sesiones_activas.sql
- v2.11_calculo_cuenta_consolidada.sql
- v2.12_otp_tokens.sql
- v2.13_estado_usuarios.sql
- v2.14_descuento_inventario.sql
- v2.15_descuento_inventario.sql
- v2.16_traslado_cuentas_mesas.sql
- v2.17_tablero_kanban_cocina.sql
- v2.18_sesiones_division_cuentas.sql
- v2.19_division_items_detalle.sql
- v2.20_pagos_division.sql
- v2.21_passwords_desarrollo.sql
- v2.22_movimientos_inventario_trazabilidad.sql
- v2.23_sesiones_juego_tiempos_tarifa.sql
- v2.24_modificar_pagos_total_seleccionado.sql
- v2.25_create_tabla_comprobantes.sql
- v2.26_create_tabla_comprobante_items.sql
- v2.27_modificar_importes_cierres_caja.sql
- v2.28_agregar_periodo_cierres_caja.sql
- v2.29_agregar_verificado_en_pagos.sql
- v2.30_create_tabla_cierre_pagos.sql
- v2.31_compras_recepciones_parciales.sql
- v2.32_productos_version_inventario.sql
- v2.33_create_recepciones_compra.sql
- v2.34_create_historial_costos_recepciones.sql
- v2.35_alertas_inventario_episodios.sql
- v2.36_productos_historial_costos_opcional.sql
- v2.37_participantes_pedidos.sql
- v2.38_participantes_temporales_homonimos.sql
- v2.39_sesiones_mesa.sql
- v2.40_rondas_consumo.sql
- v2.41_divisiones_sesion_pagadores.sql
- v2.42_divisiones_modalidades_ciclo.sql
- v2.43_sesiones_juego_pedido_directo.sql
- v2.44_configuracion_negocio.sql
- v2.45_instalacion_limpia_v1.sql
- v2.46_recuperacion_password_segura.sql
- v2.47_productos_imagen_opcional.sql

Semillas existentes: v1.1, v1.9, v2.6 y v2.8; se conservan como pruebas históricas. Incluyen referencias de ejemplo y esquemas anteriores; no importarlas en bloque sobre la baseline. No se incluyeron volcados de la base activa.
