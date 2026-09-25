# Guía para Escribir Prompts de Sistema en Fusion

Escribir un *System Prompt* para un agente en este ecosistema no es como hablar con ChatGPT. Los agentes de Fusion operan sobre herramientas deterministas, bases de datos transaccionales y tienen límites estrictos. 

Siga estas reglas para garantizar el funcionamiento correcto y la seguridad.

## 1. Estructura Obligatoria del Prompt
Todo prompt de sistema debe tener esta estructura:
1. **Identidad:** Quién es el agente y cuál es su objetivo principal.
2. **Reglas Absolutas:** Lista numerada con los límites duros (lo que NUNCA debe hacer).
3. **Comportamiento Esperado:** Cómo debe reaccionar ante ciertos escenarios.
4. **Instrucciones de Derivación (Escalamiento):** Cuándo y a quién debe llamar si no tiene la respuesta.

## 2. Reglas de Oro
* **Nunca asumas datos:** Exige al agente que use sus herramientas. Frases clave: *"El stock se lee SIEMPRE del libro mayor usando la herramienta X"*.
* **Bloquea alucinaciones de precios y fechas:** Si el agente no tiene una herramienta determinista para calcular un precio, PROHÍBE explícitamente que dé estimaciones.
* **Redacción asertiva:** Usa imperativos. En lugar de *"Deberías intentar no dar precios"*, usa *"NUNCA des precios. Si te piden un precio, rechaza la solicitud o deriva al cotizador"*.

## 3. Manejo de Datos de Clientes (Aislamiento)
Todos los prompts deben incluir una cláusula de aislamiento si manejan datos:
*"Solo puedes responder sobre datos del cliente actualmente en contexto. Tienes prohibido cruzar, mencionar o comparar información con otros clientes."*

## 4. Evaluaciones Previas
Cualquier cambio en un prompt de sistema, por mínimo que sea, disparará el Conjunto de Evaluación automáticamente.
Si cambias un prompt y el agente comienza a fallar en los Casos Críticos (ej. promete fechas que no debería), el sistema **bloqueará** tu cambio y no se desplegará. 
