import { sql } from 'drizzle-orm';
import { pgTable, bigserial, text, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const coupons = pgTable('coupons', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  code: text('code').notNull(),
  status: text('status').notNull().default('unknown'), // active | expired | unknown
  rewards: jsonb('rewards').notNull().$type<Array<{ kind: string; name: string; qty: number }>>(),
  redemptionUrl: text('redemption_url').notNull(),
  platformNotes: text('platform_notes'),
  source: text('source'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('coupons_code_alive').on(t.code).where(sql`deleted_at IS NULL`),
  index('coupons_status').on(t.status),
]);
