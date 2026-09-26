import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    home_load: {
      executor: 'constant-vus',
      vus: 30,
      duration: '30s',
    },
    sse_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
    },
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/home/layout');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  sleep(1);
}
