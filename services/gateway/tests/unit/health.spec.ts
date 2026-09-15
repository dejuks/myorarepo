import request from 'supertest';
import { createApp } from '../../src/app';

describe('GET /health', () => {
  it('returns 200 with service identity', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('api-gateway');
  });
});

describe('unimplemented service routes', () => {
  it('returns 503 for a public, not-yet-implemented route', async () => {
    // wiki-service is registered (requiresAuth: false) but implemented: false,
    // so this exercises the 503 path without needing a token.
    const app = createApp();
    const res = await request(app).get('/api/v1/wiki/some-article');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('returns 401 for an unimplemented route that also requires auth, before ever reaching the proxy', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/journals/some-id');
    expect(res.status).toBe(401);
  });
});

describe('unknown routes', () => {
  it('returns 404 for a path outside the service registry', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
  });
});
