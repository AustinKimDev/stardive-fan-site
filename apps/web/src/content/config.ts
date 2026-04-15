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

const tier = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../../content/tier' }),
  schema: z.object({
    title: z.string(),
    version: z.string(),
    publishedAt: z.coerce.date(),
    context: z.enum(['reroll', 'pve', 'boss', 'story', 'pvp']),
    summary: z.string(),
  }),
});

export const collections = { coupons, tier };
