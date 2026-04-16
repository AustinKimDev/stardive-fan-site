import { sql } from 'drizzle-orm';
import { pgTable, bigserial, text, timestamp, jsonb, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const guides = pgTable('guides', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(), // reroll | tier | community | event | tip | map
  summary: text('summary').notNull(),
  bodyMd: text('body_md'),
  sections: jsonb('sections').$type<Array<{ area: string; images: string[]; note?: string }>>(),
  sourceUrl: text('source_url'),
  sourceLabel: text('source_label'),
  author: text('author'),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('guides_slug_alive').on(t.slug).where(sql`deleted_at IS NULL`),
]);
