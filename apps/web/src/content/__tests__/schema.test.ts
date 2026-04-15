import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

const rewardKind = z.enum(['currency', 'material', 'gold', 'ring', 'architect']);
const couponSchema = z.object({
  code: z.string(),
  status: z.enum(['active', 'expired', 'unknown']),
  rewards: z.array(z.object({ kind: rewardKind, name: z.string(), qty: z.number() })).min(1),
  redemptionUrl: z.string().url(),
  source: z.string().url(),
  firstSeenAt: z.coerce.date(),
  platformNotes: z.string().optional(),
});

describe('coupons.yaml', () => {
  it('모든 쿠폰이 스키마를 통과한다', () => {
    const filePath = resolve(process.cwd(), '../../content/coupons.yaml');
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
    for (const c of parsed as unknown[]) couponSchema.parse(c);
    expect((parsed as unknown[]).length).toBeGreaterThanOrEqual(7);
  });
});
