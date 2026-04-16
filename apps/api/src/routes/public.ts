import { Hono } from 'hono';
import { eq, isNull, desc, asc } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { characters, coupons, artifacts, guides, tiers } from '@stardive/db';

const pub = new Hono();

pub.get('/characters', async (c) => {
  const rows = await db
    .select()
    .from(characters)
    .where(isNull(characters.deletedAt))
    .orderBy(asc(characters.rarity), asc(characters.nameKo));
  return c.json(rows);
});

pub.get('/characters/:slug', async (c) => {
  const [row] = await db
    .select()
    .from(characters)
    .where(eq(characters.slug, c.req.param('slug')))
    .limit(1);
  if (!row) return c.json({ error: '캐릭터 없음' }, 404);
  return c.json(row);
});

pub.get('/coupons', async (c) => {
  const rows = await db
    .select()
    .from(coupons)
    .where(isNull(coupons.deletedAt))
    .orderBy(desc(coupons.firstSeenAt));
  return c.json(rows);
});

pub.get('/artifacts', async (c) => {
  const rows = await db
    .select()
    .from(artifacts)
    .where(isNull(artifacts.deletedAt))
    .orderBy(asc(artifacts.rarity), asc(artifacts.nameKo));
  return c.json(rows);
});

pub.get('/guides', async (c) => {
  const rows = await db
    .select()
    .from(guides)
    .where(isNull(guides.deletedAt))
    .orderBy(desc(guides.publishedAt));
  return c.json(rows);
});

pub.get('/guides/:slug', async (c) => {
  const [row] = await db
    .select()
    .from(guides)
    .where(eq(guides.slug, c.req.param('slug')))
    .limit(1);
  if (!row) return c.json({ error: '가이드 없음' }, 404);
  return c.json(row);
});

pub.get('/tiers', async (c) => {
  const rows = await db
    .select()
    .from(tiers)
    .where(isNull(tiers.deletedAt))
    .orderBy(desc(tiers.publishedAt));
  return c.json(rows);
});

export { pub as publicRoutes };
