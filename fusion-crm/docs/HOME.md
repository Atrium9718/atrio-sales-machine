# Guía del Tablero de Inicio (Home)

Este documento describe el catálogo de widgets del tablero de inicio, qué mide cada indicador, de dónde salen sus datos y qué significa cada color, escrito para los líderes y gestores de producción.

## Catálogo de Widgets

### 1. Capacidad de Planta (`capacidad_planta`)
- **Qué Mide:** El porcentaje de utilización del tiempo disponible de los operarios en la planta durante la semana actual.
- **Origen de Datos:** Se calcula sumando las horas de esfuerzo (Capacity) registradas por los operarios frente a las horas totales de sus turnos.
- **Semáforo:**
  - **Verde (<85%):** Capacidad saludable, hay margen para absorber imprevistos.
  - **Ámbar (85-95%):** Capacidad ajustada, riesgo de cuellos de botella.
  - **Rojo (>95%):** Sobrecarga de trabajo, se requiere priorización inmediata.

### 2. Conversión de Embudo (`conversion_embudo`)
- **Qué Mide:** La tasa a la que las oportunidades de venta (leads) se convierten en clientes reales.
- **Origen de Datos:** Total de tratos ganados sobre el total de tratos procesados en el embudo comercial.
- **Semáforo:**
  - **Verde (>20%):** Tasa óptima de conversión comercial.
  - **Ámbar (10-20%):** Conversión promedio.
  - **Rojo (<10%):** Tasa baja, requiere revisión de los procesos de ventas.

### 3. Rentabilidad de Clientes (`rentabilidad_clientes`)
- **Qué Mide:** El margen de beneficio real frente al presupuestado para cada cliente.
- **Origen de Datos:** Se resta el costo real de los insumos y mano de obra del ingreso total generado por cliente.
- **Semáforo:**
  - **Verde (>30%):** Margen sano y rentable.
  - **Ámbar (15-30%):** Rentabilidad regular, revisar costos.
  - **Rojo (<15%):** Cliente poco rentable, posible pérdida de dinero.

### 4. Cumplimiento de Tareas (`mis_tareas_resumen`)
- **Qué Mide:** El avance de las órdenes de producción asignadas.
- **Origen de Datos:** Tareas iniciadas y finalizadas en el kiosko de planta.
- **Semáforo:**
  - **Verde:** Trabajo adelantado o en tiempo.
  - **Rojo:** Atraso respecto a las metas diarias.

*Nota: En dispositivos móviles, los widgets más pesados como la Capacidad de Planta muestran una versión simplificada con enlaces directos para mantener la agilidad de la aplicación.*
