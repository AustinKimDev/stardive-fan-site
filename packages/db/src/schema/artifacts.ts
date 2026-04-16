import { sql } from 'drizzle-orm';
import { pgTable, bigserial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const artifacts = pgTable('artifacts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull(),
  nameKo: text('name_ko').notNull(),
  rarity: text('rarity').notNull().default('unknown'),
  exclusiveCharacterSlug: text('exclusive_character_slug'),
  description: text('description'),
  sourceUrl: text('source_url'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('artifacts_slug_alive').on(t.slug).where(sql`deleted_at IS NULL`),
]);
