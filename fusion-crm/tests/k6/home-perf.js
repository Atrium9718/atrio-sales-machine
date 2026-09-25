import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Prueba de Rendimiento k6 — Home y Motor de Widgets (Etapa 15.2)
 * Objetivo: 50 usuarios concurrentes pidiendo el Home; responder el 95% en < 200 ms y con 0% de errores.
 */
export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Ramp-up inicial
    { duration: '20s', target: 50 }, // Carga sostenida de 50 usuarios concurrentes
    { duration: '5s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    // 95% de las peticiones deben responder en menos de 200 ms
    http_req_duration: ['p(95)<200'],
    // 0% de errores (tasa de fallos < 1%)
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const ROLES = ['comercial', 'produccion', 'planta', 'gerencia', 'admin'];

export default function () {
  // Simular usuarios con distintos roles
  const randomRole = ROLES[Math.floor(Math.random() * ROLES.length)];

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': randomRole,
      'x-user-id': `perf-user-${__VU}`,
    },
  };

  // 1. Petición para resolver la disposición de widgets
  const layoutRes = http.get(`${BASE_URL}/api/home/layout?device=DESKTOP`, params);

  check(layoutRes, {
    'layout status is 200': (r) => r.status === 200,
    'layout returns widgets array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.widgets);
      } catch {
        return false;
      }
    },
  });

  // 2. Simular carga de datos para widgets clave (con caché cliente TanStack)
  const widgetsToFetch = ['mi_dia', 'meta_ventas'];
  for (const wKey of widgetsToFetch) {
    const dataRes = http.get(`${BASE_URL}/api/home/widget-data/${wKey}?dateRange=THIS_MONTH`, params);
    check(dataRes, {
      [`widget-data ${wKey} status is 200`]: (r) => r.status === 200,
    });
  }

  sleep(1);
}
