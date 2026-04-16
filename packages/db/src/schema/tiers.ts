import { sql } from 'drizzle-orm';
import { pgTable, bigserial, text, timestamp, jsonb, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const tiers = pgTable('tiers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  version: text('version').notNull(),
  context: text('context').notNull(), // reroll | pve | boss | story | pvp
  summary: text('summary').notNull(),
  tierData: jsonb('tier_data').$type<Array<{ name: string; characters: Array<{ name: string; element: string; role: string; rarity?: string; slug?: string }> }>>(),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('tiers_slug_alive').on(t.slug).where(sql`deleted_at IS NULL`),
]);
