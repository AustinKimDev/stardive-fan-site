/**
 * Seed verification script
 *
 * Usage: DATABASE_URL=postgres://... tsx seed/verify.ts
 *
 * Counts rows in each seeded table and asserts minimum counts.
 * Exits with code 1 if any assertion fails.
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(import.meta.dirname, '../../../.env') });
import { createDb } from '../src/client.js';
import { characters, coupons, artifacts, guides, tiers } from '../src/schema/index.js';
import { count, isNull } from 'drizzle-orm';

interface TableCheck {
  name: string;
  actual: number;
  minimum: number;
}

async function main() {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const db = createDb(databaseUrl);

  // Count only non-deleted rows (WHERE deleted_at IS NULL)
  const [
    [charRow],
    [couponRow],
    [artifactRow],
    [guideRow],
    [tierRow],
  ] = await Promise.all([
    db.select({ value: count() }).from(characters).where(isNull(characters.deletedAt)),
    db.select({ value: count() }).from(coupons).where(isNull(coupons.deletedAt)),
    db.select({ value: count() }).from(artifacts).where(isNull(artifacts.deletedAt)),
    db.select({ value: count() }).from(guides).where(isNull(guides.deletedAt)),
    db.select({ value: count() }).from(tiers).where(isNull(tiers.deletedAt)),
  ]);

  const checks: TableCheck[] = [
    { name: 'characters', actual: Number(charRow?.value ?? 0), minimum: 15 },
    { name: 'coupons',    actual: Number(couponRow?.value ?? 0), minimum: 7 },
    { name: 'artifacts',  actual: Number(artifactRow?.value ?? 0), minimum: 20 },
    { name: 'guides',     actual: Number(guideRow?.value ?? 0), minimum: 1 },
    { name: 'tiers',      actual: Number(tierRow?.value ?? 0), minimum: 1 },
  ];

  let allPassed = true;

  console.log('\nSeed verification results:');
  console.log('─'.repeat(48));
  console.log(`${'Table'.padEnd(16)} ${'Count'.padEnd(8)} ${'Min'.padEnd(8)} Status`);
  console.log('─'.repeat(48));

  for (const check of checks) {
    const passed = check.actual >= check.minimum;
    const status = passed ? 'PASS' : 'FAIL';
    console.log(
      `${check.name.padEnd(16)} ${String(check.actual).padEnd(8)} ${String(check.minimum).padEnd(8)} ${status}`,
    );
    if (!passed) allPassed = false;
  }

  console.log('─'.repeat(48));

  if (allPassed) {
    console.log('\nAll checks passed.');
    process.exit(0);
  } else {
    console.error('\nOne or more checks FAILED. Run the seed script first: pnpm seed');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
