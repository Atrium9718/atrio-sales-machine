# Runbook de Producción - Fusion ERP / CRM

## Trabajos Programados (Cron Jobs)
Los siguientes trabajos en segundo plano se ejecutan de manera programada para el mantenimiento y actualización de la plataforma:

1. **Purga de Retención de Chat (`chat:retention`)**
   - **Frecuencia:** Diario a las 2:30 AM (COT).
   - **Propósito:** Elimina los mensajes directos y de canales generales que superen los 24 meses de antigüedad. No afecta los canales vinculados a entidades de negocio.

2. **Cálculo de Capacidad (`performance:capacity`)**
   - **Frecuencia:** Cada hora en el minuto 0.
   - **Propósito:** Recalcula y actualiza la ocupación de planta sumando los registros de tiempos (Activity) de los operarios para mantener fresco el widget `capacidad_planta`.

3. **Limpieza de Llamadas Huérfanas (`calls:cleanup`)**
   - **Frecuencia:** Cada 15 minutos.
   - **Propósito:** Detecta y cierra sesiones de llamadas en memoria donde todos los participantes se han desconectado pero no se emitió el evento de finalización, liberando los recursos de LiveKit.

## Resolución de Problemas Frecuentes

### ¿Qué hacer si el canal SSE (tiempo real) se satura?
- **Síntoma:** Retrasos superiores a 5 segundos en la entrega de mensajes de chat o estado de llamadas; clientes perdiendo conexión con `ERR_INCOMPLETE_CHUNKED_ENCODING`.
- **Acción Inmediata:**
  1. Revisar los logs del backend para identificar picos inusuales de `client connected` en la ruta `/api/chat/stream`.
  2. Aumentar temporalmente la variable `REALTIME_MAX_CONNECTIONS_PER_USER` en el entorno o reiniciar el pod de la aplicación para purgar conexiones zombi.
  3. Comprobar la conexión con Redis si se está usando Pub/Sub (`REALTIME_REDIS_CHANNEL_PREFIX`).

### ¿Qué hacer si LiveKit deja de responder?
- **Síntoma:** Las salas de videollamada no conectan, los botones de unirse muestran error 500 al intentar adquirir tokens.
- **Acción Inmediata:**
  1. Verificar si las variables de entorno de LiveKit (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`) son válidas.
  2. Si el servidor LiveKit está caído (por ejemplo, timeout de conexión wss://), **no hay que reiniciar la aplicación Fusion**. El hook `useLiveKitConfig` y la API tienen un mecanismo de degradación. Si LiveKit falla, deshabilitar temporalmente la variable `LIVEKIT_API_KEY` en producción; el sistema desactivará los botones de llamada elegantemente sin romper el CRM.
  3. Revisar el servidor TURN (Coturn) mediante la consola de GCP si los operarios no logran hacer P2P (variables `TURN_REALM`, `TURN_SECRET`).
