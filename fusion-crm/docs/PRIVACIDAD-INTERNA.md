# Directiva y Límite Duro de Privacidad — Fusion ERP / CRM (Etapa 15.5)

## 1. Visibilidad del Rendimiento y Tareas Ajenas

El módulo de rendimiento y seguimiento de tareas de la planta está diseñado para proteger la privacidad individual mientras se mantiene la visibilidad operativa necesaria para cada rol:

1. **Operarios (Rol Planta):** Solo tienen acceso a su propio rendimiento (`mi-rendimiento`), sus tareas del turno y sus metas individuales. No pueden consultar las horas, el cumplimiento ni las tareas asignadas a sus compañeros de turno ni a otras áreas.
2. **Supervisores (Rol Producción):** Tienen acceso a la vista agregada de rendimiento de su equipo de planta (`equipo/rendimiento`), pero la información individual se muestra de manera agregada o estrictamente relacionada con la capacidad operativa (cuellos de botella).
3. **Roles Administrativos y Gerenciales (Rol Gerencia):** Tienen visibilidad global (`performance:read_team`, `cost:read`) para decisiones estratégicas, incluyendo la capacidad de planta y rentabilidad por cliente. Solo la gerencia tiene acceso a los paneles que muestran márgenes financieros reales, rentabilidad neta o métricas consolidadas. Usuarios sin `cost:read` tienen bloqueados y ocultos los widgets financieros en el Home y la API denegará cualquier petición directa.

## 2. Principio Fundamental de Confidencialidad en Mensajería Interna

En cumplimiento de la legislación colombiana (Ley Estatutaria 1581 de 2012 de Protección de Datos Personales y el derecho constitucional a la intimidad y secreto de las comunicaciones), la plataforma **Fusion ERP / CRM** establece límites arquitectónicos y criptográficos estrictos sobre el canal de chat interno:

1. **Canales Públicos:** Son de acceso abierto para todos los colaboradores de la organización con permiso `chat:read`.
2. **Canales de Entidad (Proyectos, Cotizaciones, Clientes):** Su acceso está reservado exclusivamente a los involucrados y usuarios autorizados en la respectiva entidad de negocio.
3. **Canales Privados y Mensajes Directos (DM 1 a 1 y grupales cerrados):**
   - **Límite Duro Inquebrantable:** Ninguna interfaz gráfica de usuario, consola de administración ni vista de gerencia permite listar, leer, filtrar o espiar mensajes directos ni canales privados en los que el usuario activo **no sea miembro participante**.
   - El canal de tiempo real (Server-Sent Events) y la API REST validan en el servidor en cada suscripción y en cada petición que el solicitante sea miembro legítimo. Los no miembros jamás reciben paquetes de datos ni eventos de canales privados ajenos.

---

## 2. Procedimiento Excepcional de Exportación Legal o Judicial

En circunstancias extraordinarias donde la empresa requiera auditar o extraer una conversación directa (por requerimiento judicial formal, proceso disciplinario debidamente notificado, o investigación legal corporativa vinculante):

### Requisitos Obligatorios
1. **Privilegio Restringido:** Solo perfiles con el permiso explícito `chat:export` (reservado a las áreas de Oficialía de Cumplimiento / Asesoría Jurídica) pueden iniciar el proceso.
2. **Doble Confirmación en UI:** El sistema despliega un diálogo de advertencia de alta severidad que exige:
   - Confirmación explícita de doble paso.
   - Digitación justificada del motivo legal o radicado judicial (mínimo 15 caracteres descriptivos).
3. **Trazabilidad Inmutable en AuditLog:**
   - La acción queda registrada con el tipo `CHAT_DIRECT_EXPORT_LEGAL_OVERRIDE`.
   - Se guarda el ID del solicitante, la fecha/hora exacta en estándar UTC/COT, la dirección IP, el ID del canal y el motivo legal fundado.
4. **Notificación Obligatoria a los Titulares:**
   - En el instante en que se ejecuta la exportación forzada, el sistema genera automáticamente una notificación de alta prioridad a los participantes titulares de la conversación directa, informándoles de la exportación y el radicado legal asociado. No existen extracciones silenciosas o encubiertas.

---

## 3. Retención de Datos de Conversaciones

1. **Canales de Entidad (Proyectos, Cotizaciones, Clientes):**
   - **Retención Indefinida:** Debido a su condición de soporte técnico, trazabilidad de producción y archivo histórico comercial/operativo, los mensajes vinculados a entidades no son purgados automáticamente.
2. **Canales Generales, Departamentales y Mensajes Directos:**
   - **Retención Estándar:** 24 meses (730 días) contados a partir de su creación.
   - El trabajo nocturno programado `chat:retention` (diario a las 2:30 COT) purga automáticamente mensajes con antigüedad superior a los 24 meses en canales no clasificados como `ENTITY`.
3. **MinIO y Archivos Adjuntos:**
   - Los archivos subidos se verifican con validación de tipo MIME real (magic bytes) y análisis antivirus ClamAV. El límite máximo de subida es de 25 MB por archivo.
