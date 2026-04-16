import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './lib/db.js';
import * as schema from '@stardive/db';

const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 30 }, // 30 days
  user: {
    additionalFields: {
      role: { type: 'string' as const, defaultValue: 'user', input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        async after(user) {
          if (adminEmails.includes(user.email)) {
            const { eq } = await import('drizzle-orm');
            await db
              .update(schema.users)
              .set({ role: 'admin' })
              .where(eq(schema.users.id, user.id));
          }
        },
      },
    },
  },
  trustedOrigins: [process.env.FRONTEND_URL ?? 'https://mongil.peo.kr'],
});
