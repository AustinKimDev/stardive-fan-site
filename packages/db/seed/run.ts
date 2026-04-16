/**
 * YAML → Postgres seed script
 *
 * Usage: DATABASE_URL=postgres://... tsx seed/run.ts
 *
 * Idempotent: safe to run multiple times.
 *   - characters / artifacts / guides / tiers: onConflictDoUpdate by slug
 *   - coupons: onConflictDoNothing by code
 */

// DATABASE_URL은 package.json scripts의 dotenv -e ../../.env 로 주입됨
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, basename, extname } from 'node:path';
import yaml from 'js-yaml';
import matter from 'gray-matter';
import { createDb } from '../src/client.js';
import { characters, coupons, artifacts, guides, tiers } from '../src/schema/index.js';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTENT_ROOT = resolve(new URL('../../../content', import.meta.url).pathname);

function readYaml<T>(filePath: string): T {
  const raw = readFileSync(filePath, 'utf-8');
  return yaml.load(raw) as T;
}

function listYamlFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map((f) => join(dir, f));
}

function listMdFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .map((f) => join(dir, f));
}

/** Derive a slug from a filename (strip extension). */
function slugFromFile(filePath: string): string {
  return basename(filePath, extname(filePath));
}

// ---------------------------------------------------------------------------
// Character seeding
// ---------------------------------------------------------------------------

interface CharacterYaml {
  slug: string;
  name_ko: string;
  name_en?: string;
  region: string;
  element?: string;
  style?: string;
  rarity?: string;
  role?: string;
  cv_kr?: string;
  cv_jp?: string;
  description?: string;
  portrait?: string;
  full?: string;
  source_url?: string;
  tierS?: boolean;
  bloom_max?: number;
  is_published?: boolean;
}

async function seedCharacters(db: ReturnType<typeof createDb>) {
  const dir = join(CONTENT_ROOT, 'characters');
  const files = listYamlFiles(dir);

  const rows = files.map((f) => {
    const data = readYaml<CharacterYaml>(f);
    return {
      slug: data.slug ?? slugFromFile(f),
      nameKo: data.name_ko,
      nameEn: data.name_en ?? '',
      region: data.region,
      element: data.element ?? null,
      style: data.style ?? null,
      rarity: data.rarity ?? 'unknown',
      role: data.role ?? null,
      cvKr: data.cv_kr ?? null,
      cvJp: data.cv_jp ?? null,
      description: data.description ?? null,
      portrait: data.portrait ?? null,
      full: data.full ?? null,
      sourceUrl: data.source_url ?? null,
      tierS: data.tierS ?? false,
      bloomMax: data.bloom_max ?? 6,
      isPublished: data.is_published ?? false,
    } as const;
  });

  if (rows.length === 0) return;

  await db
    .insert(characters)
    .values(rows)
    .onConflictDoNothing();

  console.log(`  characters: ${rows.length} rows upserted`);
}

// ---------------------------------------------------------------------------
// Coupon seeding
// ---------------------------------------------------------------------------

interface CouponYaml {
  code: string;
  status?: string;
  rewards: Array<{ kind: string; name: string; qty: number }>;
  redemptionUrl: string;
  platformNotes?: string;
  source?: string;
  firstSeenAt?: string | Date;
  expiresAt?: string | Date | null;
}

async function seedCoupons(db: ReturnType<typeof createDb>) {
  const filePath = join(CONTENT_ROOT, 'coupons.yaml');
  const rows = readYaml<CouponYaml[]>(filePath);

  if (!rows || rows.length === 0) return;

  const values = rows.map((r) => ({
    code: r.code,
    status: r.status ?? 'unknown',
    rewards: r.rewards,
    redemptionUrl: r.redemptionUrl,
    platformNotes: r.platformNotes ?? null,
    source: r.source ?? null,
    firstSeenAt: r.firstSeenAt ? new Date(String(r.firstSeenAt)) : new Date(),
    expiresAt: r.expiresAt ? new Date(String(r.expiresAt)) : null,
  }));

  // onConflictDoNothing: partial unique index on code WHERE deleted_at IS NULL
  // We target the code column; rows with same code are simply skipped.
  await db
    .insert(coupons)
    .values(values)
    .onConflictDoNothing();

  console.log(`  coupons: ${values.length} rows inserted (existing skipped)`);
}

// ---------------------------------------------------------------------------
// Artifact seeding
// ---------------------------------------------------------------------------

interface ArtifactYaml {
  slug: string;
  name_ko: string;
  rarity?: string;
  exclusive_character_slug?: string | null;
  description?: string | null;
  source_url?: string | null;
}

async function seedArtifacts(db: ReturnType<typeof createDb>) {
  const dir = join(CONTENT_ROOT, 'artifacts');
  const files = listYamlFiles(dir);

  const rows = files.map((f) => {
    const data = readYaml<ArtifactYaml>(f);
    return {
      slug: data.slug ?? slugFromFile(f),
      nameKo: data.name_ko,
      rarity: data.rarity ?? 'unknown',
      exclusiveCharacterSlug: data.exclusive_character_slug ?? null,
      description: data.description ?? null,
      sourceUrl: data.source_url ?? null,
    } as const;
  });

  if (rows.length === 0) return;

  await db
    .insert(artifacts)
    .values(rows)
    .onConflictDoNothing();

  console.log(`  artifacts: ${rows.length} rows upserted`);
}

// ---------------------------------------------------------------------------
// Guide seeding
// ---------------------------------------------------------------------------

interface GuideYaml {
  slug: string;
  title: string;
  category: string;
  summary: string;
  body_md?: string;
  sections?: Array<{ area: string; images: string[]; note?: string }>;
  source_url?: string;
  sourceUrl?: string;
  source_label?: string;
  sourceLabel?: string;
  author?: string;
  is_published?: boolean;
  published_at?: string | Date;
  publishedAt?: string | Date;
}

async function seedGuides(db: ReturnType<typeof createDb>) {
  const dir = join(CONTENT_ROOT, 'guides');
  const files = listYamlFiles(dir);

  const rows = files.map((f) => {
    const data = readYaml<GuideYaml>(f);
    const slug = data.slug ?? slugFromFile(f);
    const publishedAtRaw = data.published_at ?? data.publishedAt;
    return {
      slug,
      title: data.title,
      category: data.category,
      summary: data.summary,
      bodyMd: data.body_md ?? null,
      sections: data.sections ?? null,
      sourceUrl: data.source_url ?? data.sourceUrl ?? null,
      sourceLabel: data.source_label ?? data.sourceLabel ?? null,
      author: data.author ?? null,
      isPublished: data.is_published ?? false,
      publishedAt: publishedAtRaw ? new Date(String(publishedAtRaw)) : null,
    } as const;
  });

  if (rows.length === 0) return;

  await db
    .insert(guides)
    .values(rows)
    .onConflictDoNothing();

  console.log(`  guides: ${rows.length} rows upserted`);
}

// ---------------------------------------------------------------------------
// Tier seeding (MDX with YAML frontmatter via gray-matter)
// ---------------------------------------------------------------------------

interface TierFrontmatter {
  title: string;
  version: string;
  publishedAt?: string | Date;
  context: string;
  summary: string;
  tiers?: Array<{
    name: string;
    description?: string;
    characters: Array<{ name: string; element: string; role: string; rarity?: string; slug?: string }>;
  }>;
}

async function seedTiers(db: ReturnType<typeof createDb>) {
  const dir = join(CONTENT_ROOT, 'tier');
  const files = listMdFiles(dir);

  const rows = files.map((f) => {
    const raw = readFileSync(f, 'utf-8');
    const { data } = matter(raw);
    const fm = data as TierFrontmatter;
    const slug = slugFromFile(f);
    const publishedAtRaw = fm.publishedAt;

    // Normalize tiers array → tierData shape expected by the schema
    const tierData = (fm.tiers ?? []).map((t) => ({
      name: t.name,
      characters: (t.characters ?? []).map((c) => ({
        name: c.name,
        element: c.element,
        role: c.role,
        rarity: c.rarity,
        slug: c.slug,
      })),
    }));

    return {
      slug,
      title: fm.title,
      version: fm.version ?? '1.0.0',
      context: fm.context,
      summary: fm.summary,
      tierData,
      isPublished: false,
      publishedAt: publishedAtRaw ? new Date(String(publishedAtRaw)) : null,
    } as const;
  });

  if (rows.length === 0) return;

  await db
    .insert(tiers)
    .values(rows)
    .onConflictDoNothing();

  console.log(`  tiers: ${rows.length} rows upserted`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  console.log('Starting seed...');
  const db = createDb(databaseUrl);

  await seedCharacters(db);
  await seedCoupons(db);
  await seedArtifacts(db);
  await seedGuides(db);
  await seedTiers(db);

  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
