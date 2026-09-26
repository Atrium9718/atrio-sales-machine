# Telefonía en el Celular: Guía de Configuración y Desvío Móvil (Etapa 17.4)

## 1. Estrategia Móvil de Fusion CRM
Para atender llamadas comerciales y de soporte fuera de la oficina o en desplazamientos, Fusion CRM ofrece dos modalidades integradas:

1. **Softphone Móvil (Vía Aplicación SIP):** Zoiper, Linphone o Groundwire instalados en el celular mediante Wi-Fi o datos 4G/5G.
2. **Desvío Inteligente a Línea GSM (Sin Aplicación):** La centralita Asterisk desvía la llamada como una llamada telefónica normal al número celular del asesor.

---

## 2. Modalidad 1: Aplicación SIP en el Celular

### Clientes Compatibles Recomendados
- **Zoiper SIP Softphone** (iOS / Android) — Gratuito y de bajo consumo de batería.
- **Linphone** (iOS / Android) — Código abierto con soporte completo de TLS y SRTP.
- **Groundwire / Acrobits** (iOS / Android) — Soporte nativo de notificaciones Push (Apple APNs / Google FCM).

### Parámetros de Conexión
Desde la barra de voz de Fusion CRM, haga clic en el ícono de **Celular** para ver sus parámetros individuales:

| Parámetro | Valor |
| :--- | :--- |
| **Dominio / PBX** | `pbx.fusioncg.com` |
| **Puerto SIP** | `5061` (TLS) o `5060` (UDP) |
| **Transporte** | `TLS` (Recomendado para cifrado total) |
| **Usuario / Extensión** | Asignada por el CRM (ej. `ext_101`) |
| **CallerID** | Nombre del asesor |
| **Contraseña** | Haga clic en **Revelar Contraseña** en el CRM |

> **Nota de Seguridad:** Por políticas corporativas, la contraseña SIP permanece cifrada en la base de datos (AES-256-GCM). Cada vez que un usuario solicita revelarla en pantalla, el sistema registra un log de auditoría inmutable con la IP de origen, la fecha y el ID de usuario.

---

## 3. Modalidad 2: Desvío Móvil Inteligente (GSM)

### ¿Cómo Funciona?
Si el asesor comercial no tiene la aplicación abierta o se encuentra en una zona con baja cobertura de datos, Asterisk utiliza la troncal telefónica saliente para timbrar directamente a su línea celular personal colombiana (ej. `+57 310 555 9876`).

### Estrategias de Timbrado
1. **`BROWSER_THEN_MOBILE` (Recomendada):**
   - La llamada entrante timbra durante **15 segundos** en el navegador de la computadora.
   - Si el asesor no contesta en la web, Asterisk lanza inmediatamente la llamada al número celular.
2. **`SIMULTANEOUS`:**
   - La llamada timbra al mismo tiempo en el navegador y en el celular. El primer dispositivo en contestar toma la conversación.
3. **`BROWSER_ONLY`:**
   - No desvía llamadas al celular bajo ninguna circunstancia (ideal para asesores que solo atienden en su puesto de trabajo).

---

## 4. Protección Anti-Buzón Móvil con DTMF 1

### El Problema de los Buzones Celulares
Cuando una llamada se desvía a un teléfono móvil y el celular está apagado, fuera de servicio o el usuario rechaza la llamada, la compañía de telefonía móvil (Claro, Movistar, Tigo, WOM) contesta inmediatamente con una locución:
> *"El número al que usted llama se encuentra apagado o fuera del área de cobertura..."*

Para un PBX convencional, esa locución cuenta como una "llamada contestada", lo que provocaría que el cliente se quede hablando con la casilla de voz del celular del asesor y que la llamada nunca regrese a la cola de atención del CRM.

### La Solución de Fusion CRM
Cuando Asterisk desvía la llamada a la línea celular:
1. El asesor contesta su celular y escucha una locución del conmutador:
   > *"Llamada de Fusion CRM para [Nombre del Cliente]. Presione 1 para contestar."*
2. **El asesor presiona la tecla 1 en el teclado numérico de su celular.**
3. En ese instante exacto, Asterisk conecta el audio entre el cliente y el asesor.
4. **Si el celular estaba apagado:** El buzón de voz de Claro/Tigo/Movistar no es capaz de presionar la tecla 1. Tras 5 segundos sin recibir el tono DTMF `1`, Asterisk detecta automáticamente el buzón, cuelga la llamada al celular y devuelve al cliente a la cola de atención del CRM o al menú principal, sin pérdida de oportunidades comerciales.
