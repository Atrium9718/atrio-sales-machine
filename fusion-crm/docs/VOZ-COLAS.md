# Etapa 17.6 — Colas de Atención Telefónica, Buzón de Voz y Desbordes

## 1. Decisión Arquitectónica Fundamental (Decisión 3)

> **"Las colas las hace el CRM, NO app_queue."**
> 
> No se carga el módulo `app_queue`, no se escribe `queues.conf` y no se utiliza la aplicación `Queue()` del dialplan de Asterisk. Un agente es un `User` del CRM con permisos de telefonía; una cola de atención es una fila en PostgreSQL (`VoiceQueue`).

### Ventajas de la Arquitectura en el CRM:
1. **Unificación de Estado:** El CRM conoce el estado real del usuario (en reunión, almuerzo, atendiendo cotización, en llamada saliente).
2. **Estrategias Flexibles y Dinámicas:** Cambio instantáneo de estrategias, penalidades y habilidades sin recargar Asterisk.
3. **Holding Bridges Nativos ARI:** Asterisk se limita a manejar el audio:
   - Al entrar a la cola, el canal entra a un `bridge` de tipo `holding` con música en espera (`music_on_hold`).
   - El llamante no se mueve del holding bridge mientras el CRM busca al agente candidato.
   - Cuando el agente candidato contesta (canal SIP originado por ARI), ambos canales son transferidos a un bridge de tipo `mixing` con proxy_media.
4. **Respiro (Wrap-Up) Inteligente:** Tras colgar, el asesor entra en estado `WRAP_UP` con un conteo regresivo configurable (ej. 10s o 30s) para cerrar notas antes de recibir otra llamada.
5. **Auto-pausa por llamadas perdidas:** Si un asesor timbra y no contesta 2 veces consecutivas, el CRM lo pasa automáticamente a pausa (`BREAK` con motivo `NO_CONTESTO_2_VECES`) evitando enviar llamadas a puestos desatendidos.

---

## 2. Estrategias de Reparto (ACD)

Implementadas como funciones puras en `packages/core/src/voice/queueStrategies.ts`:

1. **`RINGALL` (Timbrado Simultáneo):**
   - Timbra a todos los agentes disponibles del nivel de penalidad más bajo simultáneamente.
   - El primero que contesta gana la llamada; a los demás se les cancela el timbrado.

2. **`ROUND_ROBIN` (Turno Rotativo):**
   - Reparto circular en orden de lista respetando quién atendió la última vez.
   - Si un agente no está disponible, salta al siguiente en la rueda.

3. **`LEAST_RECENT` (Menos Reciente):**
   - Asigna la llamada al agente cuyo `lastCallEndedAt` sea el más antiguo (quien lleva más tiempo sin hablar).

4. **`FEWEST_CALLS` (Menos Llamadas Atendidas):**
   - Prioriza al agente con menor número de llamadas completadas en la jornada (`callsHandledToday`).
   - En caso de empate, desempata por mayor tiempo libre.

5. **`LONGEST_IDLE` (Mayor Tiempo Libre):**
   - Asigna al agente que lleva más tiempo continuo en estado `AVAILABLE` sin recibir llamadas.

6. **`SKILL_BASED` (Enrutamiento por Habilidades):**
   - Filtra primero a los miembros que tengan todas las habilidades requeridas (`requiredSkills`).
   - Luego aplica la estrategia base (por ejemplo, el que tenga menor penalidad o menor tiempo de llamada).

---

## 3. Desbordes y SLA

Cada cola cuenta con un disparador de desborde evaluado continuamente:
- **Por Tiempo Máximo de Espera (`maxWaitSeconds`):** ej. 180 segundos.
- **Por Capacidad Máxima de Llamantes (`maxCallers`):** ej. 15 llamadas simultáneas en espera.
- **Por Cola Vacía Sin Agentes Conectados (`NO_AGENTS`):** Si ningún asesor está en línea, la llamada desborda de inmediato sin hacer esperar al cliente.
- **Por Tecla de Salida (`exitKey`):** El cliente puede pulsar `*` o `9` para salir al buzón sin perder tiempo.

### Destinos de Desborde Soportados:
1. **`VOICEMAIL`:** Transfiere al buzón de voz de la cola.
2. **`ANOTHER_QUEUE`:** Desborda a una cola de respaldo (ej. Soporte a Comercial).
3. **`EXTERNAL_NUMBER`:** Desvía a un número celular o guardia externa vía troncal SIP.
4. **`AI_AGENT`:** Transfiere al agente de IA conversacional.
5. **`HANGUP_WITH_MESSAGE`:** Reproduce locución de disculpa, cuelga y crea una tarea urgente en el CRM.

---

## 4. Buzón de Voz del CRM (VoiceVoicemail)

- **Sin `app_voicemail` de Asterisk:**
  - El canal se graba directamente mediante `ari.recordChannel(...)` con:
    - Duración máxima de 120 segundos (`maxDurationSeconds: 120`).
    - Detección de silencio de 5 segundos (`maxSilenceSeconds: 5`).
    - Terminación instantánea al presionar `#` (`terminateOn: '#'`).
    - Pitido previo (`beep: true`).
  - La grabación se guarda y se indexa en `VoiceVoicemail`.
  - Se crea inmediatamente una `Task` en el CRM asignada al responsable de la cola o extensión.
  - Se encola el trabajo de transcripción automática con Gemini en español colombiano.
  - En la interfaz `/voz/buzon`:
    - Reproductor de audio WAV con velocidad ajustable (1x, 1.25x, 1.5x) y barra interactiva.
    - Transcripción sincronizada.
    - Botón de click-to-call ("Devolver Llamada") que marca desde el softphone.
    - Marcación de llamada devuelta con notas de cierre.

---

## 5. Pruebas y Cobertura

- Pruebas unitarias de estrategias ACD: `packages/core/src/voice/queueStrategies.test.ts` (23 tests exhaustivos cubriendo empates, penalidades y ausencias).
- Pruebas de integración de colas y desbordes en `apps/voice/src/services/queue.ts`.
