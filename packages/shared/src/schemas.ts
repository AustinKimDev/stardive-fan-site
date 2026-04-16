import { z } from 'zod';

export const characterResponseSchema = z.object({
  id: z.number(),
  slug: z.string(),
  nameKo: z.string(),
  nameEn: z.string(),
  region: z.string(),
  element: z.string().nullable(),
  style: z.string().nullable(),
  rarity: z.string(),
  role: z.string().nullable(),
  cvKr: z.string().nullable(),
  cvJp: z.string().nullable(),
  description: z.string().nullable(),
  portrait: z.string().nullable(),
  full: z.string().nullable(),
  tierS: z.boolean(),
});

export const couponResponseSchema = z.object({
  id: z.number(),
  code: z.string(),
  status: z.string(),
  rewards: z.array(z.object({ kind: z.string(), name: z.string(), qty: z.number() })),
  redemptionUrl: z.string(),
  platformNotes: z.string().nullable(),
  firstSeenAt: z.string(),
  expiresAt: z.string().nullable(),
  lastVerifiedAt: z.string().nullable(),
});

export const artifactResponseSchema = z.object({
  id: z.number(),
  slug: z.string(),
  nameKo: z.string(),
  rarity: z.string(),
  exclusiveCharacterSlug: z.string().nullable(),
  description: z.string().nullable(),
});

export const guideResponseSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  category: z.string(),
  summary: z.string(),
  bodyMd: z.string().nullable(),
  sections: z
    .array(
      z.object({
        area: z.string(),
        images: z.array(z.string()),
        note: z.string().optional(),
      }),
    )
    .nullable(),
  sourceUrl: z.string().nullable(),
  sourceLabel: z.string().nullable(),
  author: z.string().nullable(),
  publishedAt: z.string().nullable(),
});

export type CharacterResponse = z.infer<typeof characterResponseSchema>;
export type CouponResponse = z.infer<typeof couponResponseSchema>;
export type ArtifactResponse = z.infer<typeof artifactResponseSchema>;
export type GuideResponse = z.infer<typeof guideResponseSchema>;
