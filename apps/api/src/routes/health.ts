import { Hono } from 'hono';

const health = new Hono();

health.get('/healthz', (c) => c.json({ ok: true, ts: Date.now() }));

export { health as healthRoutes };
