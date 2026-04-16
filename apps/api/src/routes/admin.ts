import { Hono } from 'hono';
import { requireAdmin } from '../middleware/admin.js';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  [key: string]: unknown;
};

type SessionInfo = {
  id: string;
  userId: string;
  [key: string]: unknown;
};

type Env = {
  Variables: {
    user: AdminUser;
    session: SessionInfo;
  };
};

const admin = new Hono<Env>();

// Apply requireAdmin to all admin routes
admin.use('/*', requireAdmin);

// GET /api/admin/me — returns the current admin session user
admin.get('/me', (c) => {
  return c.json({
    user: c.get('user'),
    session: c.get('session'),
  });
});

export { admin as adminRoutes };
