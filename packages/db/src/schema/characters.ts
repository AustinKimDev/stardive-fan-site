import { sql } from 'drizzle-orm';
import { pgTable, bigserial, text, boolean, timestamp, smallint, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const characters = pgTable('characters', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull(),
  nameKo: text('name_ko').notNull(),
  nameEn: text('name_en').notNull().default(''),
  region: text('region').notNull(), // ellendor | barein | serenia | sura | namryeong
  element: text('element'), // fire | ice | earth | wind | thunder
  style: text('style'), // brawler | destroyer | assassin | support
  rarity: text('rarity').notNull().default('unknown'), // 5seong | 4seong | 3seong | unknown
  role: text('role'),
  cvKr: text('cv_kr'),
  cvJp: text('cv_jp'),
  description: text('description'),
  portrait: text('portrait'),
  full: text('full'),
  sourceUrl: text('source_url'),
  tierS: boolean('tier_s').default(false),
  bloomMax: smallint('bloom_max').default(6),
  isPublished: boolean('is_published').default(false),
  pendingUpdate: jsonb('pending_update'),
  lastCrawledAt: timestamp('last_crawled_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('characters_slug_alive').on(t.slug).where(sql`deleted_at IS NULL`),
  index('characters_published').on(t.isPublished, t.rarity, t.region),
]);
