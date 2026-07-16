-- ====================================================================
-- Módulo de Roles, Usuarios y Seguridad - API
-- v2.5 - 16 de Julio de 2026
-- ====================================================================

USE `mydb`;

-- 1. Documentación del Estado de la Migración
SELECT 'Inicializando estandarización de políticas de seguridad y roles' AS Estado;

-- 2. Ajuste de Integridad Referencial en la tabla `usuarios`
-- Aseguramos que si cambia el ID de un rol, se actualice en cascada en los usuarios asociados.
ALTER TABLE `usuarios` DROP FOREIGN KEY `fk_usuarios_roles1`;
ALTER TABLE `usuarios` 
ADD CONSTRAINT `fk_usuarios_roles1`
  FOREIGN KEY (`roles_id`) 
  REFERENCES `roles` (`id`)
  ON DELETE NO ACTION
  ON UPDATE CASCADE; -- Aplicamos actualización en cascada para consistencia

-- 3. Confirmación de la correcta ejecución del script
SELECT 'Módulo de usuarios y roles alineado con políticas CASCADE con éxito' AS Resultado;