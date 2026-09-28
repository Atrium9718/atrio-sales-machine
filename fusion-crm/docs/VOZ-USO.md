# Manual de Uso de Telefonía y Softphone (Etapa 17.4)

## 1. Introducción
El módulo de telefonía de **Fusion CRM** integra directamente las comunicaciones de voz dentro del navegador, comunicándose mediante WebSockets seguros (WSS) con la centralita telefónica Asterisk 22 y el motor ARI.

---

## 2. Barra Superior de Voz (VoiceBar)
La barra de voz está ubicada en la parte superior derecha de la aplicación y contiene:
1. **Indicador de Conexión:**
   - **Verde ("Conectado"):** El softphone está registrado contra Asterisk y listo para recibir y emitir llamadas.
   - **Amarillo ("Conectando..."):** Negociando credenciales o reconectando el túnel WebRTC/WSS.
   - **Azul ("Espejo"):** La sesión SIP activa reside en otra pestaña del navegador. Esta pestaña replica la UI y permite responder/colgar sin abrir múltiples conexiones simultáneas.
   - **Rojo ("Sin conexión"):** Error de registro o red.
2. **Selector de Estado de Agente:**
   - **Disponible:** Recibe llamadas entrantes de colas y desvíos directos.
   - **Ocupado:** Asterisk no enviará llamadas de cola mientras esté en este estado.
   - **En Pausa:** Permite seleccionar el motivo (*Almuerzo*, *Reunión*, *Descanso*, *Capacitación*, *Otro*). Se audita para métricas de contact center.
   - **Desconectado:** Cierra temporalmente la atención telefónica.
3. **Contador de Colas:** Muestra en tiempo real cuántas personas esperan en las colas donde el agente es miembro. Cambia a rojo parpadeante si la espera supera los 60 segundos.
4. **Teclado Telefónico:** Abre el marcador numérico manual y búsqueda rápida de contactos.
5. **Buzón de Voz:** Notifica llamadas perdidas con mensajes de voz grabados y transcripción por inteligencia artificial.
6. **Configuración de Audio:** Selección de micrófono, altavoces, prueba de timbre y grabación de 3 segundos para calibrar volumen.

---

## 3. Recepción de Llamadas (Modal Entrante Flotante)
Cuando entra una llamada:
- Se abre una tarjeta flotante en la esquina inferior derecha que **no bloquea** el trabajo en pantalla.
- **Identidad:** Resuelve automáticamente el nombre del cliente y el contacto asociado según la base de datos de Fusion CRM.
- **Temperatura del Cliente:** Muestra si es *Caliente* (🔥), *Tibio* (☀️), *Frío* (❄️) o *VIP* (👑).
- **Contexto CRM Rápido:**
  - Última actividad registrada.
  - Cotizaciones activas con montos (si el usuario tiene permiso `cost:read`).
  - Proyectos en producción y fecha comprometida.
  - Estado de cartera y facturas vencidas (requiere `cost:read`).
  - Tareas pendientes asignadas al usuario.
- **Atajos de Teclado:**
  - `[Enter]`: Contestar llamada.
  - `[Escape]`: Rechazar llamada.
- **Silenciar Timbre:** El botón de altavoz en la cabecera apaga el sonido del timbre en la pestaña sin rechazar ni colgar la llamada.
- **Ver Ficha Completa:** Abre la ficha del cliente en una nueva vista sin cortar la llamada.

---

## 4. Panel de Llamada Activa y Bloc de Notas
Durante la conversación:
- **Badge de Grabación:** Se muestra permanentemente el indicador `● GRABANDO`.
- **Pausa de Grabación:** Si el cliente va a dictar información bancaria o confidencial, use el botón `Pausar REC` para cumplir con normativas de protección de datos.
- **Métricas de Calidad WebRTC:** Monitorea en tiempo real la latencia (RTT), jitter y pérdida de paquetes. Si detecta problemas de red, avisa con un mensaje explicativo (ej. congestión de Wi-Fi).
- **Bloc de Notas con Auto-Guardado:** Todas las notas escritas durante la llamada se guardan automáticamente cada 3 segundos en el registro `VoiceCall.notes`.
- **Acciones CRM Rápidas:** Cree tareas, agende citas o inicie cotizaciones directamente desde los botones del panel sin navegar fuera de la llamada.

---

## 5. Transferencias de Llamadas
Haga clic en el botón **Transferir** para abrir el asistente:
- **A Compañeros:** Muestra en vivo quién está Disponible, Ocupado o En Pausa.
- **A Colas de Atención:** Transfiere al grupo de Ventas, Soporte, Producción o Cartera.
- **A Número Externo:** Permite desviar la llamada a cualquier teléfono celular o fijo de Colombia.
- **Modalidades:**
  - **Transferir ya (Ciega):** Envía la llamada directamente al destino.
  - **Consultar primero (Atendida):** Pone en espera al cliente, permite hablar primero con el compañero y, tras confirmación, enlaza a ambas partes.

---

## 6. Click-to-Call en Todo el CRM
Todos los números telefónicos en las tablas y fichas de clientes usan el componente `<PhoneLink />`:
- Al hacer clic en el número, el softphone marca de inmediato sin necesidad de copiar y pegar dígitos.
- Muestra tooltip con el formato internacional colombiano (`+57 3XX XXX XXXX`) y el historial de la última llamada.

---

## 7. Comportamiento Multi-Pestaña y Seguridad
- **Coordinación Inteligente:** Puede abrir tantas pestañas de Fusion CRM como desee. Únicamente la pestaña maestra mantiene la conexión WebSocket viva contra Asterisk. Las demás pestañas sincronizan el estado por `BroadcastChannel`. Si cierra la pestaña maestra, otra pestaña asume el control en menos de 100 milisegundos.
- **Seguridad de Contraseñas:** Las contraseñas SIP nunca se almacenan en `localStorage` ni en cookies del navegador; residen únicamente en la memoria RAM del proceso y se solicitan mediante tokens de un solo uso con auditoría estricta.
