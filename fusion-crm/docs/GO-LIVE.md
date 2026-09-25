# Checklist de Despliegue (Go-Live) - Fusion ERP / CRM

## Requisitos de Infraestructura
- [ ] **Traefik v3 y Let's Encrypt:** Certificados vigentes generados para el dominio principal (fusioncg.com).
- [ ] **Almacenamiento (MinIO):** Buckets creados para chat, documentos de proyectos y perfiles. Credenciales sincronizadas.
- [ ] **Base de Datos:** Migraciones ejecutadas exitosamente. Índices optimizados.
- [ ] **Notificaciones Push VAPID:** Llaves públicas y privadas configuradas para Service Workers.

## Configuración de Llamadas y WebRTC (LiveKit)
Para que las llamadas P2P y de sala (Etapa 15.6) funcionen correctamente en redes corporativas estrictas, es indispensable verificar lo siguiente antes de salir a producción:

- [ ] **Subdominio de Llamadas:** Asegurar que `meet.fusioncg.com` (o el configurado en `LIVEKIT_URL`) apunte correctamente a la instancia de LiveKit y que los certificados TLS (Let's Encrypt) estén activos, ya que `getUserMedia` exige conexión segura estricta.
- [ ] **Puertos UDP de LiveKit:** Apertura en el firewall/VPC de los puertos `50000-60000 UDP` para el enrutamiento de medios (ICE/WebRTC).
- [ ] **Servidor TURN (Coturn):** En caso de que los clientes estén bajo NAT estricta o firewalls corporativos que bloqueen UDP, se debe tener habilitado Coturn en el puerto `3478 TCP/UDP` y `5349 TCP/UDP` (TLS). Las credenciales deben estar reflejadas en `TURN_REALM` y `TURN_SECRET`.
- [ ] **Fallback Opcional:** Comprobar que al eliminar `LIVEKIT_API_KEY` temporalmente de las variables de entorno, la plataforma inicia con las videollamadas ocultas sin errores secundarios de la interfaz.

## Pruebas de Estrés y Aceptación
- [ ] Los tests de Playwright (`tests/e2e`) pasaron exitosamente.
- [ ] Los tests de k6 en `tests/k6` confirmaron <2s carga en Home con 30 usuarios, y estabilidad en SSE con 50 usuarios simultáneos.
- [ ] El Kiosko de Planta opera correctamente bajo modo "Offline" usando IndexedDB local y Service Worker.
