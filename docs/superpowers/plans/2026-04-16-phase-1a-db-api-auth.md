# Phase 1-A: DB + API 서버 + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** YAML 파일 기반 정적 컨텐츠를 Postgres DB + Hono API 서버로 전환하고, better-auth로 관리자 인증을 구현한다. 프론트엔드(Astro)는 API에서 데이터를 읽도록 변경.

**Architecture:** `packages/db`(Drizzle 스키마+마이그레이션) → `apps/api`(Hono 서버, better-auth, REST 엔드포인트) → `apps/web`(Astro가 API 호출). Postgres는 yohan-server-infra의 `postgres-db` 컨테이너 재사용. Docker Compose에 `mongil-api` 서비스 추가.

**Tech Stack:** Hono, Drizzle ORM, better-auth, PostgreSQL 15, pg-boss (Phase 1-C용 테이블 예약), Zod, pnpm workspace

**Spec:** `docs/superpowers/specs/2026-04-15-stardive-fan-site-design.md` §2–§7

**Infra:** `yohan-server-infra` 의 `postgres-db:5432` (external network `side-project-network`)

---

## 0. File Structure

```
stardive-fan-site/
├─ apps/
│  ├─ api/                          ← NEW: Hono API 서버
│  │  ├─ src/
│  │  │  ├─ index.ts                Hono app entry
│  │  │  ├─ auth.ts                 better-auth 설정
│  │  │  ├─ middleware/
│  │  │  │  ├─ admin.ts             관리자 화이트리스트 guard
│  │  │  │  └─ rate-limit.ts        LRU rate limiter
│  │  │  ├─ routes/
│  │  │  │  ├─ public.ts            공개 읽기 (캐릭터, 쿠폰, 아티팩트, 가이드, 티어)
│  │  │  │  ├─ admin.ts             관리자 CRUD (Phase 1-B에서 확장)
│  │  │  │  └─ health.ts            /healthz
│  │  │  └─ lib/
│  │  │     └─ db.ts                Drizzle client singleton
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ Dockerfile
│  ├─ web/                          기존 Astro 앱 (수정)
│  │  └─ src/
│  │     ├─ lib/
│  │     │  └─ api.ts               ← NEW: API client wrapper
│  │     └─ pages/                  content collection → API fetch 전환
│  └─ worker/                       ← STUB (Phase 1-C)
│     └─ package.json
├─ packages/
│  ├─ db/                           ← NEW: Drizzle 스키마 + 마이그레이션
│  │  ├─ src/
│  │  │  ├─ schema/
│  │  │  │  ├─ characters.ts
│  │  │  │  ├─ coupons.ts
│  │  │  │  ├─ artifacts.ts
│  │  │  │  ├─ guides.ts
│  │  │  │  ├─ tiers.ts
│  │  │  │  ├─ users.ts             better-auth 테이블
│  │  │  │  ├─ audit-log.ts
│  │  │  │  └─ index.ts             barrel export
│  │  │  ├─ client.ts               drizzle() 생성
│  │  │  └─ index.ts
│  │  ├─ drizzle.config.ts
│  │  ├─ seed/
│  │  │  ├─ run.ts                  YAML→DB 시드 스크립트
│  │  │  └─ verify.ts               시드 검증
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  └─ shared/                       ← NEW: 공유 Zod 스키마 + 타입
│     ├─ src/
│     │  ├─ schemas.ts              API request/response Zod 스키마
│     │  ├─ types.ts                공유 타입
│     │  └─ constants.ts            enum 값, region/element 라벨
│     ├─ package.json
│     └─ tsconfig.json
├─ infra/
│  ├─ docker-compose.yml            mongil-api 서비스 추가
│  └─ .env.example                  ← NEW
└─ turbo.json                       빌드 의존성 업데이트
```

---

## Task 1: packages/db 스캐폴딩 + Drizzle 스키마

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/src/schema/characters.ts`
- Create: `packages/db/src/schema/coupons.ts`
- Create: `packages/db/src/schema/artifacts.ts`
- Create: `packages/db/src/schema/guides.ts`
- Create: `packages/db/src/schema/tiers.ts`
- Create: `packages/db/src/schema/users.ts`
- Create: `packages/db/src/schema/audit-log.ts`
- Create: `packages/db/src/schema/index.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: package.json**

```json
{
  "name": "@stardive/db",
  "type": "module",
  "private": true,
  "exports": { ".": "./src/index.ts", "./client": "./src/client.ts" },
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate",
    "push": "drizzle-kit push",
    "studio": "drizzle-kit studio",
    "seed": "tsx seed/run.ts",
    "seed:verify": "tsx seed/verify.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.39.0",
    "postgres": "^3.4.7"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.3",
    "dotenv": "^16.4.7"
  }
}
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*", "seed/**/*", "drizzle.config.ts"]
}
```

- [ ] **Step 3: drizzle.config.ts**

```typescript
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: 스키마 — characters.ts**

```typescript
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
  uniqueIndex('characters_slug_alive').on(t.slug).where('deleted_at IS NULL'),
  index('characters_published').on(t.isPublished, t.rarity, t.region),
]);
```

- [ ] **Step 5: 스키마 — coupons.ts**

```typescript
import { pgTable, bigserial, text, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const coupons = pgTable('coupons', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  code: text('code').notNull(),
  status: text('status').notNull().default('unknown'), // active | expired | unknown
  rewards: jsonb('rewards').notNull().$type<Array<{ kind: string; name: string; qty: number }>>(),
  redemptionUrl: text('redemption_url').notNull(),
  platformNotes: text('platform_notes'),
  source: text('source'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('coupons_code_alive').on(t.code).where('deleted_at IS NULL'),
  index('coupons_status').on(t.status),
]);
```

- [ ] **Step 6: 스키마 — artifacts.ts**

```typescript
import { pgTable, bigserial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const artifacts = pgTable('artifacts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull(),
  nameKo: text('name_ko').notNull(),
  rarity: text('rarity').notNull().default('unknown'),
  exclusiveCharacterSlug: text('exclusive_character_slug'),
  description: text('description'),
  sourceUrl: text('source_url'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('artifacts_slug_alive').on(t.slug).where('deleted_at IS NULL'),
]);
```

- [ ] **Step 7: 스키마 — guides.ts**

```typescript
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
  uniqueIndex('guides_slug_alive').on(t.slug).where('deleted_at IS NULL'),
]);
```

- [ ] **Step 8: 스키마 — tiers.ts**

```typescript
import { pgTable, bigserial, text, timestamp, jsonb, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const tiers = pgTable('tiers', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  version: text('version').notNull(),
  context: text('context').notNull(), // reroll | pve | boss | story | pvp
  summary: text('summary').notNull(),
  tierData: jsonb('tier_data').$type<Array<{ name: string; characters: Array<{ name: string; element: string; role: string; rarity?: string; slug?: string }> }>>(),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('tiers_slug_alive').on(t.slug).where('deleted_at IS NULL'),
]);
```

- [ ] **Step 9: 스키마 — users.ts (better-auth 호환)**

```typescript
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'), // admin | user
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 10: 스키마 — audit-log.ts**

```typescript
import { pgTable, bigserial, text, timestamp, jsonb, inet } from 'drizzle-orm/pg-core';

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actorUserId: text('actor_user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  diff: jsonb('diff'),
  ip: inet('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 11: barrel export (schema/index.ts + src/index.ts)**

`packages/db/src/schema/index.ts`:
```typescript
export * from './characters';
export * from './coupons';
export * from './artifacts';
export * from './guides';
export * from './tiers';
export * from './users';
export * from './audit-log';
```

`packages/db/src/client.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

export function createDb(url: string) {
  const client = postgres(url, { max: 10 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
```

`packages/db/src/index.ts`:
```typescript
export * from './schema/index';
export { createDb, type Database } from './client';
```

- [ ] **Step 12: pnpm install + 마이그레이션 생성**

```bash
pnpm install
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stardive" > packages/db/.env
pnpm --filter @stardive/db generate
```
Expected: `drizzle/` 폴더에 SQL 마이그레이션 파일 생성.

- [ ] **Step 13: Commit**

```bash
git add packages/db/
git commit -m "feat(db): drizzle schema — characters, coupons, artifacts, guides, tiers, users, audit_log"
```

---

## Task 2: packages/shared (공유 타입 + Zod 스키마)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: package.json**

```json
{
  "name": "@stardive/shared",
  "type": "module",
  "private": true,
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "zod": "^3.23.8" },
  "devDependencies": { "typescript": "^5.6.3" }
}
```

- [ ] **Step 2: constants.ts — enum 라벨 맵**

```typescript
export const REGION_LABELS = {
  ellendor: '엘렌도르', barein: '바레인', serenia: '세레니아', sura: '수라', namryeong: '남령',
} as const;

export const ELEMENT_LABELS = {
  fire: '불', ice: '얼음', earth: '땅', wind: '바람', thunder: '번개',
} as const;

export const STYLE_LABELS = {
  brawler: '난투', destroyer: '파괴', assassin: '암살', support: '지원',
} as const;

export const RARITY_LABELS = {
  '5seong': '5성', '4seong': '4성', '3seong': '3성', unknown: '?성',
} as const;

export type Region = keyof typeof REGION_LABELS;
export type Element = keyof typeof ELEMENT_LABELS;
export type Style = keyof typeof STYLE_LABELS;
export type Rarity = keyof typeof RARITY_LABELS;
```

- [ ] **Step 3: schemas.ts — API Zod 스키마**

```typescript
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
  sections: z.array(z.object({
    area: z.string(),
    images: z.array(z.string()),
    note: z.string().optional(),
  })).nullable(),
  sourceUrl: z.string().nullable(),
  sourceLabel: z.string().nullable(),
  author: z.string().nullable(),
  publishedAt: z.string().nullable(),
});

export type CharacterResponse = z.infer<typeof characterResponseSchema>;
export type CouponResponse = z.infer<typeof couponResponseSchema>;
export type ArtifactResponse = z.infer<typeof artifactResponseSchema>;
export type GuideResponse = z.infer<typeof guideResponseSchema>;
```

- [ ] **Step 4: index.ts barrel + install + commit**

```typescript
export * from './schemas';
export * from './types';
export * from './constants';
```

```bash
pnpm install
git add packages/shared/
git commit -m "feat(shared): zod schemas, constants, types for API contract"
```

---

## Task 3: apps/api Hono 서버 + better-auth

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/auth.ts`
- Create: `apps/api/src/lib/db.ts`
- Create: `apps/api/src/middleware/admin.ts`
- Create: `apps/api/src/middleware/rate-limit.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/routes/public.ts`
- Create: `apps/api/src/routes/admin.ts`
- Create: `apps/api/Dockerfile`

- [ ] **Step 1: package.json**

```json
{
  "name": "@stardive/api",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "start": "node --import tsx src/index.ts"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "@hono/node-server": "^1.13.0",
    "better-auth": "^1.2.0",
    "drizzle-orm": "^0.39.0",
    "postgres": "^3.4.7",
    "zod": "^3.23.8",
    "@stardive/db": "workspace:*",
    "@stardive/shared": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.3",
    "dotenv": "^16.4.7"
  }
}
```

- [ ] **Step 2: src/lib/db.ts**

```typescript
import { createDb } from '@stardive/db/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

export const db = createDb(url);
```

- [ ] **Step 3: src/auth.ts (better-auth 설정)**

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './lib/db';

const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 30 }, // 30 days
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user', input: false },
    },
  },
  callbacks: {
    async onUserCreated(user) {
      if (adminEmails.includes(user.email)) {
        // auto-promote to admin
        // Implementation: update user.role = 'admin' in DB
      }
    },
  },
  trustedOrigins: [process.env.FRONTEND_URL ?? 'https://mongil.peo.kr'],
});
```

- [ ] **Step 4: src/middleware/admin.ts**

```typescript
import { createMiddleware } from 'hono/factory';
import { auth } from '../auth';

export const requireAdmin = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: '인증 필요' }, 401);
  }
  if (session.user.role !== 'admin') {
    return c.json({ error: '관리자 권한 필요' }, 403);
  }
  c.set('user', session.user);
  c.set('session', session.session);
  await next();
});
```

- [ ] **Step 5: src/routes/public.ts (읽기 전용)**

```typescript
import { Hono } from 'hono';
import { db } from '../lib/db';
import { characters, coupons, artifacts, guides, tiers } from '@stardive/db';
import { eq, isNull, desc, asc } from 'drizzle-orm';

const pub = new Hono();

pub.get('/characters', async (c) => {
  const rows = await db.select().from(characters)
    .where(isNull(characters.deletedAt))
    .orderBy(asc(characters.rarity), asc(characters.nameKo));
  return c.json(rows);
});

pub.get('/characters/:slug', async (c) => {
  const [row] = await db.select().from(characters)
    .where(eq(characters.slug, c.req.param('slug')))
    .limit(1);
  if (!row) return c.json({ error: '캐릭터 없음' }, 404);
  return c.json(row);
});

pub.get('/coupons', async (c) => {
  const rows = await db.select().from(coupons)
    .where(isNull(coupons.deletedAt))
    .orderBy(desc(coupons.firstSeenAt));
  return c.json(rows);
});

pub.get('/artifacts', async (c) => {
  const rows = await db.select().from(artifacts)
    .where(isNull(artifacts.deletedAt))
    .orderBy(asc(artifacts.rarity), asc(artifacts.nameKo));
  return c.json(rows);
});

pub.get('/guides', async (c) => {
  const rows = await db.select().from(guides)
    .where(isNull(guides.deletedAt))
    .orderBy(desc(guides.publishedAt));
  return c.json(rows);
});

pub.get('/guides/:slug', async (c) => {
  const [row] = await db.select().from(guides)
    .where(eq(guides.slug, c.req.param('slug')))
    .limit(1);
  if (!row) return c.json({ error: '가이드 없음' }, 404);
  return c.json(row);
});

pub.get('/tiers', async (c) => {
  const rows = await db.select().from(tiers)
    .where(isNull(tiers.deletedAt))
    .orderBy(desc(tiers.publishedAt));
  return c.json(rows);
});

export { pub as publicRoutes };
```

- [ ] **Step 6: src/routes/health.ts**

```typescript
import { Hono } from 'hono';
const health = new Hono();
health.get('/healthz', (c) => c.json({ ok: true, ts: Date.now() }));
export { health as healthRoutes };
```

- [ ] **Step 7: src/routes/admin.ts (스텁 — Phase 1-B에서 확장)**

```typescript
import { Hono } from 'hono';
import { requireAdmin } from '../middleware/admin';

const admin = new Hono();
admin.use('/*', requireAdmin);

admin.get('/me', (c) => {
  return c.json({ user: c.get('user'), session: c.get('session') });
});

export { admin as adminRoutes };
```

- [ ] **Step 8: src/index.ts (Hono entry)**

```typescript
import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { auth } from './auth';
import { publicRoutes } from './routes/public';
import { adminRoutes } from './routes/admin';
import { healthRoutes } from './routes/health';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'https://mongil.peo.kr',
  credentials: true,
}));

// better-auth handler
app.on(['GET', 'POST'], '/api/auth/**', (c) => auth.handler(c.req.raw));

// routes
app.route('/', healthRoutes);
app.route('/api/public', publicRoutes);
app.route('/api/admin', adminRoutes);

const port = Number(process.env.PORT ?? 3001);
console.log(`mongil-api listening on :${port}`);
serve({ fetch: app.fetch, port });
```

- [ ] **Step 9: Dockerfile**

```dockerfile
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install --no-frozen-lockfile

COPY packages/db/ packages/db/
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

ENV NODE_ENV=production PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3001/healthz || exit 1
CMD ["node", "--import", "tsx", "apps/api/src/index.ts"]
```

- [ ] **Step 10: pnpm install + typecheck + commit**

```bash
pnpm install
pnpm --filter @stardive/api typecheck
git add apps/api/ packages/
git commit -m "feat(api): hono server + better-auth + public/admin routes"
```

---

## Task 4: DB 시드 스크립트 (YAML → Postgres)

**Files:**
- Create: `packages/db/seed/run.ts`
- Create: `packages/db/seed/verify.ts`

- [ ] **Step 1: seed/run.ts**

```typescript
import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { createDb } from '../src/client';
import { characters, coupons, artifacts, guides, tiers } from '../src/schema/index';

const db = createDb(process.env.DATABASE_URL!);
const contentDir = resolve(import.meta.dirname, '../../../content');

async function seedCharacters() {
  const dir = resolve(contentDir, 'characters');
  const files = readdirSync(dir).filter(f => f.endsWith('.yaml'));
  for (const f of files) {
    const data = parseYaml(readFileSync(resolve(dir, f), 'utf-8'));
    await db.insert(characters).values({
      slug: data.slug,
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
      isPublished: true,
    }).onConflictDoUpdate({
      target: characters.slug,
      set: {
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
        updatedAt: new Date(),
      },
    });
    console.log(`  ✓ character: ${data.slug}`);
  }
}

async function seedCoupons() {
  const raw = readFileSync(resolve(contentDir, 'coupons.yaml'), 'utf-8');
  const data = parseYaml(raw) as Array<Record<string, unknown>>;
  for (const c of data) {
    await db.insert(coupons).values({
      code: String(c.code),
      status: String(c.status ?? 'unknown'),
      rewards: c.rewards as any,
      redemptionUrl: String(c.redemptionUrl),
      platformNotes: c.platformNotes ? String(c.platformNotes) : null,
      source: c.source ? String(c.source) : null,
      firstSeenAt: new Date(String(c.firstSeenAt)),
    }).onConflictDoNothing();
    console.log(`  ✓ coupon: ${c.code}`);
  }
}

async function seedArtifacts() {
  const dir = resolve(contentDir, 'artifacts');
  const files = readdirSync(dir).filter(f => f.endsWith('.yaml'));
  for (const f of files) {
    const data = parseYaml(readFileSync(resolve(dir, f), 'utf-8'));
    await db.insert(artifacts).values({
      slug: data.slug,
      nameKo: data.name_ko,
      rarity: data.rarity ?? 'unknown',
      exclusiveCharacterSlug: data.exclusive_character_slug ?? null,
      description: data.description ?? null,
      sourceUrl: data.source_url ?? null,
    }).onConflictDoNothing();
    console.log(`  ✓ artifact: ${data.slug}`);
  }
}

async function seedGuides() {
  const dir = resolve(contentDir, 'guides');
  const files = readdirSync(dir).filter(f => f.endsWith('.yaml'));
  for (const f of files) {
    const data = parseYaml(readFileSync(resolve(dir, f), 'utf-8'));
    await db.insert(guides).values({
      slug: data.slug,
      title: data.title,
      category: data.category,
      summary: data.summary,
      sourceUrl: data.sourceUrl ?? data.externalUrl ?? null,
      sourceLabel: data.sourceLabel ?? null,
      author: data.author ?? null,
      sections: data.sections ?? null,
      isPublished: true,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
    }).onConflictDoNothing();
    console.log(`  ✓ guide: ${data.slug}`);
  }
}

async function main() {
  console.log('🌱 Seeding database...');
  await seedCharacters();
  await seedCoupons();
  await seedArtifacts();
  await seedGuides();
  console.log('✓ Seed complete');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: seed/verify.ts**

```typescript
import 'dotenv/config';
import { createDb } from '../src/client';
import { characters, coupons, artifacts, guides } from '../src/schema/index';
import { count } from 'drizzle-orm';

const db = createDb(process.env.DATABASE_URL!);

async function main() {
  const [chars] = await db.select({ n: count() }).from(characters);
  const [coups] = await db.select({ n: count() }).from(coupons);
  const [arts] = await db.select({ n: count() }).from(artifacts);
  const [guds] = await db.select({ n: count() }).from(guides);

  console.log(`characters: ${chars.n}`);
  console.log(`coupons:    ${coups.n}`);
  console.log(`artifacts:  ${arts.n}`);
  console.log(`guides:     ${guds.n}`);

  const ok = chars.n >= 15 && coups.n >= 7 && arts.n >= 20 && guds.n >= 1;
  console.log(ok ? '✓ Seed verification passed' : '✗ Seed verification FAILED');
  process.exit(ok ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Commit**

```bash
git add packages/db/seed/
git commit -m "feat(db): yaml→postgres seed script with idempotent upsert"
```

---

## Task 5: Docker Compose + .env.example 업데이트

**Files:**
- Modify: `infra/docker-compose.yml` — mongil-api 서비스 주석 해제 + 수정
- Create: `infra/.env.example`
- Modify: `turbo.json` — 빌드 의존성

- [ ] **Step 1: docker-compose.yml**

`mongil-api` 서비스 주석 해제 + `mongil-worker` 스텁 유지:
```yaml
services:
  mongil-web:
    # ... (기존 그대로)

  mongil-api:
    build:
      context: ..
      dockerfile: apps/api/Dockerfile
    container_name: mongil-api
    restart: unless-stopped
    expose: ["3001"]
    env_file: .env
    environment:
      NODE_ENV: production
      PORT: "3001"
      FRONTEND_URL: "https://mongil.peo.kr"
    networks:
      - side-network
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3001/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

networks:
  side-network:
    external: true
    name: side-project-network
```

- [ ] **Step 2: .env.example**

```env
# Database (yohan-server-infra postgres-db)
DATABASE_URL=postgresql://stardive:CHANGE_ME@postgres-db:5432/stardive

# Auth
AUTH_SECRET=CHANGE_ME_RANDOM_32_CHARS
FRONTEND_URL=https://mongil.peo.kr

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Discord OAuth
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Admin whitelist (comma-separated emails)
ADMIN_EMAILS=your@email.com

# Crawler (Phase 1-C)
DISCORD_WEBHOOK_URL=
```

- [ ] **Step 3: turbo.json 업데이트**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".astro/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": { "dependsOn": ["^typecheck"] },
    "test": {}
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add infra/ turbo.json
git commit -m "infra: add mongil-api service + .env.example + turbo deps"
```

---

## Task 6: apps/web API 클라이언트 + 페이지 전환

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/pages/index.astro` — content collection → API fetch
- Modify: `apps/web/src/pages/coupons.astro`
- Modify: `apps/web/src/pages/characters.astro`
- Modify: `apps/web/src/pages/characters/[slug].astro`
- Modify: `apps/web/src/pages/artifacts.astro`
- Modify: `apps/web/src/pages/guides.astro`
- Modify: `apps/web/src/pages/tier.astro`

- [ ] **Step 1: api.ts 클라이언트**

```typescript
const API_BASE = import.meta.env.API_URL ?? process.env.API_URL ?? 'http://mongil-api:3001';

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/public${path}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: 각 페이지에서 `getCollection()` → `apiFetch()` 교체**

예시 (coupons.astro):
```diff
- const all = await getCollection('coupons');
- const coupons = all.map(e => e.data)...
+ import { apiFetch } from '../lib/api';
+ const coupons = await apiFetch<CouponResponse[]>('/coupons');
```

각 페이지 동일 패턴. `getCollection` import 제거, `apiFetch` import 추가, 데이터 접근 경로 `.data.` → 직접 프로퍼티.

**fallback**: API 서버 다운 시 빌드 실패 방지를 위해 `try/catch` + 빈 배열 fallback 고려 (단, SSR이라 런타임 fetch이므로 build 시엔 영향 없음).

- [ ] **Step 3: apps/web/package.json에 @stardive/shared 의존성 추가**

```bash
pnpm --filter @stardive/web add @stardive/shared@workspace:*
```

- [ ] **Step 4: typecheck + commit**

```bash
pnpm typecheck
git add apps/web/
git commit -m "feat(web): switch from content collections to API fetch"
```

---

## Task 7: Caddy API 연결 + 통합 배포 테스트

- [ ] **Step 1: mongil-api.peo.kr Caddy 파일 활성화 준비**

```bash
# infra/caddy/mongil-api.peo.kr.caddy 는 이미 존재
# 서버 배포 시 yohan-server-infra/caddy/sites/ 에 복사
```

- [ ] **Step 2: 서버에서 DB 생성**

```bash
ssh apitots@45.250.223.195 'docker exec -it postgres-db psql -U postgres -c "
  CREATE DATABASE stardive;
  CREATE USER stardive WITH PASSWORD '\''SECURE_PASSWORD'\'';
  GRANT ALL PRIVILEGES ON DATABASE stardive TO stardive;
  ALTER DATABASE stardive OWNER TO stardive;
"'
```

- [ ] **Step 3: 마이그레이션 + 시드**

```bash
# 로컬에서 서버 DB에 연결 (또는 서버에서 실행)
DATABASE_URL=postgresql://stardive:SECURE_PASSWORD@45.250.223.195:5432/stardive \
  pnpm --filter @stardive/db migrate

DATABASE_URL=postgresql://stardive:SECURE_PASSWORD@45.250.223.195:5432/stardive \
  pnpm --filter @stardive/db seed

DATABASE_URL=postgresql://stardive:SECURE_PASSWORD@45.250.223.195:5432/stardive \
  pnpm --filter @stardive/db seed:verify
```

- [ ] **Step 4: .env 생성 + docker compose up**

```bash
cd infra
cp .env.example .env
# .env 에 실제 값 채우기
docker compose up -d --build mongil-api
```

- [ ] **Step 5: 검증**

```bash
curl -fs https://mongil-api.peo.kr/healthz
curl -fs https://mongil-api.peo.kr/api/public/characters | jq length
curl -fs https://mongil-api.peo.kr/api/public/coupons | jq length
```

- [ ] **Step 6: Commit 최종**

```bash
git add -A
git commit -m "feat: phase 1-A complete — db + api + auth + seed + deploy"
```

---

## Phase 1-A 완료 정의

- [ ] `mongil-api.peo.kr/healthz` → 200 OK
- [ ] `/api/public/characters` → 20개 JSON
- [ ] `/api/public/coupons` → 7개 JSON
- [ ] `/api/public/artifacts` → 28개 JSON
- [ ] `/api/public/guides` → 1+ JSON
- [ ] `mongil.peo.kr/` → API에서 데이터 읽어 정상 렌더
- [ ] better-auth Google OAuth 로그인 → 세션 생성 (관리자 이메일 → role=admin)
- [ ] `/api/admin/me` → 관리자 세션 정보 반환
- [ ] 기존 YAML 데이터 전부 DB로 시드 완료 + 검증 통과

## Next Plans

- **Phase 1-B:** Admin CRUD (`/admin/*` 페이지, react-hook-form, 이미지 업로드)
- **Phase 1-C:** Crawler (pg-boss + Playwright worker, 쿠폰 30분 폴링, SPA 캐릭터 크롤)
