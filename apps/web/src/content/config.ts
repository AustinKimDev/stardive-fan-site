import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { parse as parseYaml } from 'yaml';

const rewardKind = z.enum(['currency', 'material', 'gold', 'ring', 'architect']);

const couponSchema = z.object({
  code: z.string(),
  status: z.enum(['active', 'expired', 'unknown']),
  rewards: z.array(z.object({
    kind: rewardKind,
    name: z.string(),
    qty: z.number().int().positive(),
  })).min(1),
  redemptionUrl: z.string().url(),
  platformNotes: z.string().optional(),
  source: z.string().url(),
  firstSeenAt: z.coerce.date(),
  expiresAt: z.coerce.date().optional(),
  lastVerifiedAt: z.coerce.date().optional(),
});

const coupons = defineCollection({
  loader: file('../../content/coupons.yaml', {
    // Astro file loader requires each item to have an `id` field.
    // We inject `code` as `id` since coupons don't have a separate id.
    parser: (text) => {
      const data = parseYaml(text) as Array<Record<string, unknown>>;
      return data.map((item) => ({ id: String(item['code']), ...item }));
    },
  }),
  schema: couponSchema,
});

const characterElement = z.enum(['fire', 'ice', 'earth', 'wind', 'thunder']);
const characterRole = z.enum(['brawler', 'destroyer', 'assassin', 'support']);

const tierEntry = z.object({
  name: z.string(),
  description: z.string().optional(),
  characters: z.array(z.object({
    name: z.string(),
    element: characterElement,
    role: characterRole,
    rarity: z.enum(['SSR', 'SR', 'R']).optional(),
    slug: z.string().optional(),
  })),
});

const tier = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../content/tier' }),
  schema: z.object({
    title: z.string(),
    version: z.string(),
    publishedAt: z.coerce.date(),
    context: z.enum(['reroll', 'pve', 'boss', 'story', 'pvp']),
    summary: z.string(),
    tiers: z.array(tierEntry).optional(),
  }),
});

const characterSchema = z.object({
  slug: z.string(),
  name_ko: z.string(),
  name_en: z.string(),
  region: z.enum(['ellendor', 'barein', 'serenia', 'sura', 'namryeong']),
  element: characterElement,
  style: characterRole,
  rarity: z.enum(['SSR', 'SR', 'R']),
  role: z.string(),
  cv_kr: z.string().optional(),
  cv_jp: z.string().optional(),
  description: z.string(),
  portrait: z.string(),
  full: z.string(),
  source_url: z.string().url().optional(),
  tierS: z.boolean().optional(),
});

const characters = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: '../../content/characters' }),
  schema: characterSchema,
});

export const collections = { coupons, tier, characters };
