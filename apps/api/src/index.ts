import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { auth } from './auth.js';
import { publicRoutes } from './routes/public.js';
import { adminRoutes } from './routes/admin.js';
import { healthRoutes } from './routes/health.js';
import { publicRateLimit, adminRateLimit } from './middleware/rate-limit.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'https://mongil.peo.kr',
    credentials: true,
  }),
);

// better-auth handler
app.on(['GET', 'POST'], '/api/auth/**', (c) => auth.handler(c.req.raw));

// routes
app.route('/', healthRoutes);
app.use('/api/public/*', publicRateLimit);
app.route('/api/public', publicRoutes);
app.use('/api/admin/*', adminRateLimit);
app.route('/api/admin', adminRoutes);

const port = Number(process.env.PORT ?? 3001);
console.log(`mongil-api listening on :${port}`);

serve({ fetch: app.fetch, port });
