# Runbook de Incidentes - Salud de Canales

Este documento está diseñado para los administradores del sistema, detallando los pasos a seguir cuando el monitor de "Salud de Canales" arroja una alerta roja.

## 1. WhatsApp aparece como "Degradado" o "Caído"

**Síntoma:** El semáforo de Meta (WABA) en `/canales-config/meta` está en rojo. Los mensajes entrantes no aparecen o no se pueden enviar respuestas.
**Alertas disparadas:** Sentry arroja fallos `WebhookTimeout` o Meta devuelve HTTP 401.

**Acciones de Mitigación:**
1. Ve a **Configuración > Omnicanalidad y Salud**.
2. Identifica si el error es de "Token Expirado" o de "Webhook no alcanzable".
3. **Si el Token Expiró:** Haz clic en "Reconectar con Facebook" en la configuración del canal para generar un nuevo System User Access Token.
4. **Si el Webhook falla:** Verifica el servicio Redis y el túnel/ingress. Si el log muestra "Cola Atascada", puedes purgar la cola en el panel de Entregabilidad.

## 2. Meta bajó la "Calidad del Número"

**Síntoma:** La calidad del número de WhatsApp bajó a Media o Baja (Aparece en amarillo/rojo en el panel de salud).
**Causa:** Los clientes están bloqueando o reportando el número debido a exceso de mensajes de marketing no deseados, o mensajes irrelevantes.

**Acciones de Mitigación:**
1. **Detener Campañas:** Ve de inmediato al panel de campañas y pausa cualquier envío masivo de marketing en curso.
2. **Revisión de Entregabilidad:** Ve a la pestaña "Entregabilidad (Embudo)" y ordena las plantillas por "Tasa de Respuesta".
3. **Purgar Plantillas Tóxicas:** Identifica la plantilla con alta tasa de envío y nula respuesta o altos rebotes y desactívala.
4. Espera 7 días con tráfico exclusivamente transaccional (Utility) para que Meta restaure la reputación.

## 3. Tasa de Fallo (Errores API) supera el 5% en la hora

**Síntoma:** La cola de "Mensajes Muertos (DLQ)" se llena rápidamente.
**Causa probable:** Cambios en la estructura de la plantilla aprobada en Meta vs los parámetros que envía el CRM, o fallos de conexión externa.

**Acciones de Mitigación:**
1. Abre el panel DLQ.
2. Observa el mensaje de error de Meta (ej: `Error 131009: Parameter format does not match`).
3. Corrige la variable en el código o en la plantilla.
4. Haz clic en "Reintentar Manual" para reenviar el mensaje atascado en el DLQ.
