// k6 load scenarios for UCIP.
//
//   k6 run tests/performance/load.k6.js
//   BASE_URL=http://localhost:3000 k6 run -e SCENARIO=api tests/performance/load.k6.js
//
// Two scenarios, both read-only: this is a decision-support tool, and hammering the write paths would
// corrupt a JSON store by design (last-writer-wins on a single file).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SCENARIO = __ENV.SCENARIO || 'public';

const errorRate = new Rate('ucip_errors');

export const options = {
  scenarios: {
    public_pages: {
      executor: 'constant-vus',
      vus: SCENARIO === 'public' ? 10 : 0,
      duration: '30s',
      exec: 'publicPages',
    },
    api_reads: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: SCENARIO === 'api' ? 20 : 0 },
        { duration: '10s', target: 0 },
      ],
      exec: 'apiReads',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:public_pages}': ['p(95)<300'],
    'http_req_duration{scenario:api_reads}': ['p(95)<1500'],
    ucip_errors: ['rate<0.02'],
  },
};

// Public pages are unauthenticated on purpose: a load test must never need credentials.
export function publicPages() {
  const paths = ['/', '/tour', '/faq', '/privacy', '/testimonials'];
  const path = paths[Math.floor(Math.random() * paths.length)];
  const response = http.get(`${BASE_URL}${path}`, { tags: { name: path } });

  const ok = check(response, {
    'status is 200': (r) => r.status === 200,
    'html returned': (r) => (r.headers['Content-Type'] || '').includes('text/html'),
    'has no noindex header': (r) => !(r.headers['X-Robots-Tag'] || '').includes('noindex'),
  });
  errorRate.add(!ok);
  sleep(Math.random() * 2 + 1);
}

export function apiReads() {
  // Health is unauthenticated by design; anything else would need a session, which this test
  // deliberately does not create.
  const health = http.get(`${BASE_URL}/api/health`, { tags: { name: '/api/health' } });
  const ok = check(health, {
    'health is 200': (r) => r.status === 200,
    'health body has status ok': (r) => {
      try {
        return JSON.parse(r.body).status === 'ok';
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!ok);

  // A gated route must keep refusing anonymous callers under load — a 200 here is a security bug.
  const gated = http.get(`${BASE_URL}/api/overview`, { tags: { name: '/api/overview' }, redirects: 0 });
  errorRate.add(!check(gated, { 'gated route refuses anonymous': (r) => r.status === 401 || r.status === 307 }));

  sleep(Math.random() * 1.5 + 0.5);
}
