# Fichas de Agentes IA

Esta es la documentación oficial para personal no técnico sobre los agentes IA que operan en Fusion.

## 1. Agente Comercial (\`comercial\`)
- **Qué hace:** Prioriza a quién llamar hoy, redacta mensajes de seguimiento, y detecta clientes que han dejado de comprar (fugas) o que tienen potencial de venta cruzada.
- **Herramientas que usa:** Historial de compras, pipeline comercial, oportunidades estancadas y análisis de temperatura del cliente.
- **Qué NO hace:** NUNCA promete precios ni fechas de entrega a los clientes. Solo sugiere acciones al vendedor.
- **A quién escala:** Deriva preguntas de precios al *Cotizador* y preguntas de rentabilidad al *Financiero*.
- **Cómo se mide:** Porcentaje de propuestas comerciales aprobadas por los vendedores y reactivación de clientes inactivos.

## 2. Agente Cotizador (\`cotizador\`)
- **Qué hace:** Convierte correos o textos libres en requerimientos técnicos estructurados y genera borradores de cotizaciones.
- **Herramientas que usa:** Motor determinista de cálculo de precios y búsqueda de cotizaciones similares históricas.
- **Qué NO hace:** JAMÁS envía una cotización directamente al cliente. Todo borrador debe ser revisado y enviado por un humano. No inventa precios, utiliza siempre el motor de la Etapa 7.
- **A quién escala:** Deriva a *Capacidad* si la fecha de entrega está en riesgo, y a *Inventario* si no hay material suficiente.
- **Cómo se mide:** Ahorro de tiempo en digitación de cotizaciones y tasa de precisión al extraer requerimientos de un texto.

## 3. Agente Financiero (\`financiero\`)
- **Qué hace:** Analiza la rentabilidad real de los proyectos, desglosa por qué un margen bajó (costo de papel, horas extra, etc.) y detecta inconsistencias (como proyectos facturados sin costos reportados).
- **Herramientas que usa:** Comparación presupuesto vs. real, análisis de margen por dimensión (cliente/vendedor) y proyección de flujo.
- **Qué NO hace:** No modifica datos contables, ni aprueba presupuestos. Está protegido para responder SOLO a usuarios con el permiso \`cost:read\`.
- **A quién escala:** Generalmente es el destino final de las escalas financieras, no deriva a operativos.
- **Cómo se mide:** Identificación temprana de márgenes bajos u ocultos (fantasmas) y detección de costos atípicos.

## 4. Agente de Datos (\`datos\`)
- **Qué hace:** Vigila la salud de la base de datos de clientes y productos. Detecta duplicados, campos vacíos o mal formateados.
- **Herramientas que usa:** Detección de duplicados, validación de consistencia y sugerencia de normalización.
- **Qué NO hace:** NUNCA corrige datos automáticamente. Genera propuestas de corrección (borradores) para ser aprobadas por un administrador en la bandeja unificada.
- **Cómo se mide:** Mejora del Índice de Calidad de Datos (tendencia de reducción de vacíos/duplicados).

## 5. Agente de Capacidad (\`capacidad\`)
- **Qué hace:** Simula el impacto de insertar un trabajo urgente, calcula horas disponibles en máquinas, y propone reagendamientos.
- **Herramientas que usa:** Simulador de programación (Etapa 14.3) y análisis de secuencias.
- **Qué NO hace:** No mueve la programación real a menos que el usuario apruebe explícitamente su propuesta.
- **A quién escala:** A *Inventario* para asegurar que el reagendamiento tiene los materiales a tiempo.

## 6. Agente de Inventario (\`inventario\`)
- **Qué hace:** Calcula coberturas en base al historial, detecta inventario muerto y analiza la desviación real del desperdicio contra la fórmula teórica.
- **Herramientas que usa:** Libro mayor, consumo histórico, proveedores y evaluación de cortes (transformación).
- **Qué NO hace:** No altera el stock bajo ninguna circunstancia. Solo lee el libro mayor en tiempo real. Tampoco ejecuta compras, solo genera propuestas de compra.
- **Cómo se mide:** Reducción de inmovilización de capital (inventario muerto) y prevención de paros de máquina por falta de stock.
