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
    parser: (text) => {
      const data = parseYaml(text) as Array<Record<string, unknown>>;
      return data.map((item) => ({ id: String(item['code']), ...item }));
    },
  }),
  schema: couponSchema,
});

const characterElement = z.enum(['fire', 'ice', 'earth', 'wind', 'thunder']);
const characterRole = z.enum(['brawler', 'destroyer', 'assassin', 'support']);

// 5성/4성/3성 rarity enum (성 = seong)
const rarityEnum = z.enum(['5seong', '4seong', '3seong', 'unknown']);

const tierEntry = z.object({
  name: z.string(),
  description: z.string().optional(),
  characters: z.array(z.object({
    name: z.string(),
    element: characterElement,
    role: characterRole,
    rarity: rarityEnum.optional(),
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
  element: characterElement.optional().nullable(),
  style: characterRole.optional().nullable(),
  rarity: rarityEnum,
  role: z.string().optional().nullable(),
  cv_kr: z.string().optional().nullable(),
  cv_jp: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  portrait: z.string().nullable(),
  full: z.string().nullable(),
  source_url: z.string().url().optional().nullable(),
  tierS: z.boolean().optional(),
});

const characters = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: '../../content/characters' }),
  schema: characterSchema,
});

// 아티팩트 컬렉션
const artifactSchema = z.object({
  slug: z.string(),
  name_ko: z.string(),
  rarity: rarityEnum,
  exclusive_character_slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  source_url: z.string().url().optional().nullable(),
});

const artifacts = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: '../../content/artifacts' }),
  schema: artifactSchema,
});

export const collections = { coupons, tier, characters, artifacts };
