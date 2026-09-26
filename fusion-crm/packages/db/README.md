# Packages / DB

## Documentación del Esquema y Extensiones

### Excepción de Auditoría y Control de Concurrencia: `UserPresence`

El modelo `UserPresence` (`packages/db/prisma/schema/09-colaboracion.prisma`) gestiona el estado de presencia en tiempo real de los usuarios (`ONLINE`, `AWAY`, `BUSY`, `IN_CALL`, `DO_NOT_DISTURB`, `OFFLINE`), su dispositivo actual y su última actividad (`lastActiveAt`).

#### Razones de la Excepción:
1. **Alta Frecuencia de Escritura:** Se actualiza múltiples veces por minuto mediante heartbeats periódicos de presencia desde los clientes web, móviles y terminales kiosko.
2. **Exclusión de `AuditLog`:** Registrar un registro de auditoría por cada latido o cambio de presencia generaría millones de filas de datos transitorios e irrelevantes en `AuditLog`, degradando el rendimiento de la base de datos y saturando el almacenamiento.
3. **Sin Borrado Lógico (`deletedAt`):** La presencia es un estado vivo y efímero; los usuarios offline simplemente se marcan con estado `OFFLINE` o se limpian tras inactividad.
4. **Sin Bloqueo Optimista (`version`):** Debido a que las actualizaciones de presencia son periódicas y de última escritura gana (last-write-wins), no se requiere control de concurrencia optimista mediante `version`.
