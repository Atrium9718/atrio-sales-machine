# FUSION CRM — MODELO Y MANUAL DE SEGURIDAD VOIP (ETAPA 17.2)

Una central telefónica conectada a internet es uno de los objetivos más atacados del ecosistema tecnológico. Los escaneos automáticos (SIPvicious, Friendly-Scanner) inician en cuestión de minutos tras abrir puertos. Este documento especifica las defensas perimetrales y los protocolos de respuesta.

---

## 1. Modelo de Amenazas y Mitigaciones

| Vector de Amenaza | Objetivo del Atacante | Mitigación Implementada |
|---|---|---|
| **Fuerza Bruta SIP (INVITE / REGISTER)** | Adivinar contraseñas de extensiones para revender tráfico internacional a destinos premium (satelitales, islas). | 1. **UFW estricto**: El puerto 5060 solo acepta paquetes desde las IPs autorizadas del operador.<br>2. **Contraseñas generadas por el sistema**: 24 caracteres aleatorios (alfanuméricos + símbolos), jamás elegidas por el usuario.<br>3. **Fail2ban**: Bloqueo iptables por 24 horas tras 4 intentos fallidos. |
| **Llamadas Fantasma / Escaneo SIPvicious** | Enviar paquetes SIP INVITE directos a la IP pública buscando transferencias no autenticadas. | `allowguest = no` en `pjsip.conf`. Asterisk descarta de inmediato cualquier mensaje sin credenciales válidas. |
| **Acceso no autorizado a REST ARI** | Manipular canales, puentes y escuchar llamadas en tiempo real vía API. | 1. El puerto 8088 **NUNCA** se expone en UFW ni en internet.<br>2. Solo accesible mediante la red interna de Docker.<br>3. Contraseña ARI protegida mediante hash SHA-512 `crypt`. |
| **Toll Fraud (Fraude de Tarifas Telefónicas)** | Generar miles de minutos salientes hacia destinos satelitales o internacionales de alto costo. | 1. **Llamadas internacionales prohibidas por defecto**.<br>2. **Límite estricto de canales simultáneos** (`maxChannels` en `VoiceTrunk`).<br>3. Límite diario de minutos salientes; al superarse se bloquean las salientes y se notifica al administrador. |
| **Interceptación de Audio en Navegador** | Escuchar conversaciones entre asesores y clientes. | WebRTC exige **DTLS-SRTP con certificados criptográficos**. El audio nunca viaja en texto claro por la red. |

---

## 2. Fail2ban para Asterisk

El script de provisionamiento `infra/scripts/bootstrap-vps.sh` configura el filtro y la jaula automáticamente.

### Filtro de Seguridad (`/etc/fail2ban/filter.d/asterisk.conf`):
Detecta intentos de registro fallido, usuarios inexistentes y fallas de autenticación en `/var/log/asterisk/security`.

### Parámetros de la Jaula (`/etc/fail2ban/jail.d/asterisk.local`):
- `maxretry = 4` intentos
- `findtime = 600` segundos (10 minutos)
- `bantime = 86400` segundos (24 horas)
- `action = iptables-allports` (bloquea todos los puertos a la IP atacante)

### Comandos de Operación:

```bash
# Ver estado de la jaula y lista de IPs bloqueadas
sudo fail2ban-client status asterisk

# Desbloquear una IP bloqueada por error (ej. asesor con credencial desactualizada)
sudo fail2ban-client set asterisk unbanip <DIRECCION_IP>

# Probar la expresión regular contra el log de seguridad actual
sudo fail2ban-regex /var/log/asterisk/security /etc/fail2ban/filter.d/asterisk.conf
```

---

## 3. Política de Llamadas Internacionales y Lista Blanca

Por política de prevención de fraude de Fusión Comunicación Gráfica:
1. Las llamadas salientes están permitidas **únicamente a territorio nacional de Colombia** (fijos y celulares: prefijos `+57`, `601`, `602`, `604`, `300`, `310`, `320`, etc.).
2. Toda llamada internacional saliente está **bloqueada por defecto**.
3. Si un cliente corporativo o proveedor en el exterior requiere comunicación telefónica:
   - Se debe solicitar autorización escrita a Gerencia de Operaciones.
   - Se habilita el prefijo del país en la lista blanca de la troncal (ej. `+1` para EE.UU./Canadá, `+52` para México, `+34` para España).
   - Se fija un límite mensual de gasto y minutos para dicho prefijo.

---

## 4. Procedimiento de Rotación de Credenciales

### Rotación de Contraseña SIP de una Extensión:
1. Ingrese a `/configuracion/voz` en el CRM con rol de administrador.
2. Vaya a la pestaña **Extensiones**.
3. Localice la extensión y presione el botón de **Rotar Contraseña** (`RefreshCw`).
4. El sistema:
   - Genera una nueva clave criptográfica de 24 caracteres con `crypto.randomBytes`.
   - Cifra la clave con AES-256-GCM y la guarda en el modelo `Secret`.
   - Envía un `PUT /asterisk/config/dynamic/res_pjsip/auth/{ext}` por ARI.
   - Registra el evento en `AuditLog`.
5. Proporcione la nueva credencial al asesor de forma segura.

### Rotación de Contraseña de Asterisk ARI:
1. Generar nuevo hash crypt SHA-512 en el host:
   ```bash
   openssl passwd -6 "NUEVA_CONTRASENA_COMPLEJA_AQUI"
   ```
2. Actualizar las variables de entorno en el archivo `.env` del servidor:
   ```env
   ASTERISK_ARI_PASSWORD=NUEVA_CONTRASENA_COMPLEJA_AQUI
   ASTERISK_ARI_PASSWORD_CRYPT=$6$rounds=...
   ```
3. Reiniciar los contenedores:
   ```bash
   docker compose restart asterisk app
   ```

### Rotación de Credenciales de Troncal SIP del Operador:
1. Coordinar con el operador telefónico (Claro / ETB / Twilio) la emisión de la nueva contraseña.
2. En `/configuracion/voz` > pestaña **Troncal**, actualizar los campos y presionar **Probar Conexión**.
3. Verificar que el semáforo cambie a **VERDE** (registrada y operativa).
