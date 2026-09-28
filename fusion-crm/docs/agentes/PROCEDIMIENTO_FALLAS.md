# Procedimiento ante una Respuesta Incorrecta Grave de IA

Si un agente de inteligencia artificial genera una respuesta incorrecta con impacto en el negocio (ej. un precio equivocado, una promesa de fecha irreal, o revela un costo interno), se debe seguir este protocolo inmediato.

## 1. Contención (Inmediata)
- Reportar la falla al administrador del sistema.
- En caso de riesgo grave continuo, usar el **Kill Switch** global o individual del agente desde el panel `/admin/ia`.
- Esto apagará temporalmente la IA sin afectar el resto del sistema ERP.

## 2. Registro (Día 1)
- Ingresar a la "Cola de Retroalimentación Negativa" en el Panel de Gobierno IA.
- Marcar el mensaje exacto que causó el problema.
- El sistema capturará el ID de la conversación, el agente involucrado, el prompt exacto que tenía en ese momento, y la entrada del usuario.

## 3. Conversión a Caso de Evaluación (Día 1-2)
- Convertir el registro en un nuevo **EvalCase**.
- Clasificarlo como `CRITICAL`.
- Definir el `expectedBehavior` (ej. "El agente debió negarse a dar el precio").
- Establecer las aserciones (`assertions`), por ejemplo: `{"action": "reject"}`.

## 4. Corrección y Pruebas (Día 2-3)
- Editar el *System Prompt* del agente incluyendo una nueva Regla Absoluta que prevenga la falla.
- Ejecutar la evaluación. El sistema correrá los 20+ casos anteriores más el nuevo caso crítico.
- Analizar el Diff (Diferencia): Asegurarse de que arreglar esta falla no rompió un comportamiento anterior.
- Si la evaluación pasa con 100% en los casos `CRITICAL`, aprobar y desplegar la nueva versión.
