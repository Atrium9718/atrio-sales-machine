# Guía de Plantillas de WhatsApp (Templates)

Para iniciar una conversación con un cliente luego de que ha expirado la ventana de servicio de 24 horas, es obligatorio usar una **Plantilla (Template)** pre-aprobada por Meta.

## 1. Tipos de Plantillas y Costos

Meta clasifica y cobra las plantillas de manera diferente:

- **MARKETING:** Promociones, ofertas, anuncios de nuevos productos. *(Mayor costo por conversación)*
- **UTILITY:** Actualizaciones de envíos, confirmaciones de pedidos, recordatorios de citas. *(Menor costo por conversación)*
- **AUTHENTICATION:** Códigos OTP. *(Usualmente no aplica para nuestro uso comercial)*

En nuestro **Control de Costos Omnicanal**, verás que el costo de marketing es casi 3 veces mayor que el de servicio/utility.

## 2. Reglas de Redacción para evitar rechazos

1. **Ortografía impecable:** Meta rechaza automáticamente plantillas con errores ortográficos graves.
2. **Claridad de propósito:** Si seleccionaste categoría "Utility", el mensaje no puede contener frases como "Aprovecha" o "Compra ahora", o será rechazada o reclasificada a Marketing (cobrándote más caro).
3. **Manejo de variables:** Usa dobles llaves para las variables (ej: `Hola {{1}}, tu pedido {{2}} está listo`). No pongas variables seguidas como `{{1}} {{2}}` sin texto de por medio.
4. **Ejemplos obligatorios:** Al someter la plantilla a revisión, SIEMPRE debes enviar datos de ejemplo para las variables. Sin ejemplos, el riesgo de rechazo es del 90%.

## 3. Revisión de Rendimiento (Entregabilidad)

El CRM monitorea automáticamente cómo reaccionan los clientes a tus plantillas.

- En `/canales-config/meta`, ve a la pestaña **WhatsApp (WABA)**.
- Verás el listado de plantillas.
- **Tasa de Respuesta:** Si una plantilla de marketing tiene menos del 5% de respuesta y empieza a generar quejas de usuarios (bloqueos), el sistema la marcará en ROJO ("Revisar").
- Debes pausar las plantillas en rojo para proteger la reputación y calidad de tu número telefónico.
