import { createMiddleware } from 'hono/factory';
import { auth } from '../auth.js';

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

export const requireAdmin = createMiddleware<Env>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ error: '인증 필요' }, 401);
  }

  const user = session.user as AdminUser;
  if (user.role !== 'admin') {
    return c.json({ error: '관리자 권한 필요' }, 403);
  }

  c.set('user', user);
  c.set('session', session.session as SessionInfo);
  await next();
});
