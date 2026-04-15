# Phase 0 — 쿠폰·티어 런칭 스파이크 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 48시간 내에 `stardive-fan-site`의 쿠폰(/coupons)·리롤 티어(/tier)·홈(/)을 Astro + YAML 컨텐츠로 Cloudflare 프리프런트 뒤 VPS에 배포해, "몬길 쿠폰" / "스타다이브 티어" 구글 검색을 선점한다.

**Architecture:** Astro 5 SSR(Node standalone) + React 19 아일랜드(복사 버튼만). 컨텐츠는 `content/*.yaml|md` 리포 커밋 기반. DB·Auth·Worker·Redis 없음. Zod로 YAML 런타임 검증. Caddy+Docker로 VPS 배포, Coolify는 Phase 1에서 도입(Phase 0는 단순 `docker compose up`).

**Tech Stack:** Astro 5, React 19, TypeScript(strict), Tailwind CSS v4, shadcn/ui, Zod, gray-matter, satori(OG 이미지), pnpm, Docker, Caddy.

**Spec:** `docs/superpowers/specs/2026-04-15-stardive-fan-site-design.md` §1.3 Phase 0

---

## 0. File Structure

```
stardive-fan-site/
├─ apps/web/
│  ├─ src/
│  │  ├─ pages/
│  │  │  ├─ index.astro              홈
│  │  │  ├─ coupons.astro            쿠폰 페이지
│  │  │  ├─ tier.astro               티어 페이지
│  │  │  ├─ api/og/[...params].ts    OG 이미지 서버 렌더
│  │  │  └─ healthz.ts               헬스체크
│  │  ├─ layouts/BaseLayout.astro    공용 레이아웃 + SEO 메타
│  │  ├─ components/
│  │  │  ├─ Nav.astro                4그룹 내비 (섹션은 Phase 0엔 링크만, 없는 곳은 "곧 공개")
│  │  │  ├─ CouponCard.astro         쿠폰 1장
│  │  │  ├─ CopyButton.tsx           React 아일랜드: 복사+토스트
│  │  │  ├─ Badge.astro              상태 배지 (active/expired/unknown)
│  │  │  └─ ElementIcon.astro        속성 아이콘+라벨
│  │  ├─ content/
│  │  │  ├─ config.ts                Astro Content Collections + Zod 스키마
│  │  │  └─ (collections: coupons, tier, characters-lite)
│  │  ├─ lib/
│  │  │  ├─ seo.ts                   메타 템플릿, JSON-LD 빌더
│  │  │  └─ format.ts                날짜 포매터
│  │  └─ styles/global.css           Tailwind entry
│  ├─ public/
│  │  ├─ robots.txt
│  │  ├─ favicon.svg
│  │  └─ icons/elements/{fire,ice,earth,wind,thunder}.svg
│  ├─ astro.config.mjs
│  ├─ tailwind.config.ts
│  ├─ tsconfig.json
│  ├─ package.json
│  └─ Dockerfile
├─ content/
│  ├─ coupons.yaml                    쿠폰 실데이터
│  ├─ tier/reroll-2026-04-15.md       티어 글 (MDX)
│  └─ seo/site.yaml                   사이트 전역 메타
├─ infra/
│  ├─ docker-compose.yml              web + Caddy
│  └─ Caddyfile
├─ .github/workflows/ci.yml
├─ .gitignore
├─ .nvmrc                             24
├─ README.md
├─ package.json                       (pnpm workspaces)
├─ pnpm-workspace.yaml
└─ turbo.json                         (Phase 0엔 최소 설정, 확장 대비)
```

---

## Task 1: 리포 부트스트랩 (pnpm + workspaces + git)

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.nvmrc`, `README.md`, `turbo.json`

- [ ] **Step 1: git init + .gitignore**

```bash
cd /Users/jidong/workspace/side/stardive-fan-site
git init -b main
```

`.gitignore`:
```
node_modules
dist
.astro
.turbo
.env
.env.local
*.log
.DS_Store
coverage
playwright-report
```

- [ ] **Step 2: .nvmrc**

```
24
```

- [ ] **Step 3: 루트 package.json**

```json
{
  "name": "stardive-fan-site",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  }
}
```

- [ ] **Step 4: pnpm-workspace.yaml**

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 5: turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".astro/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": {},
    "test": {}
  }
}
```

- [ ] **Step 6: README.md 최소본**

```markdown
# stardive-fan-site

몬길: STAR DIVE 팬사이트.

## Dev
`pnpm install && pnpm dev`

## Spec
`docs/superpowers/specs/2026-04-15-stardive-fan-site-design.md`
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: bootstrap pnpm workspace"
```

---

## Task 2: Astro 앱 초기화

**Files:**
- Create: `apps/web/package.json`, `apps/web/astro.config.mjs`, `apps/web/tsconfig.json`, `apps/web/src/pages/index.astro`

- [ ] **Step 1: Astro 프로젝트 생성 (비대화형)**

```bash
cd /Users/jidong/workspace/side/stardive-fan-site
pnpm dlx create-astro@latest apps/web --template minimal --typescript strict --no-install --no-git --yes
```

- [ ] **Step 2: apps/web/package.json 확정**

```json
{
  "name": "@stardive/web",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "typecheck": "astro check",
    "lint": "eslint src --max-warnings=0",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/node": "^9.0.0",
    "@astrojs/react": "^4.0.0",
    "@astrojs/sitemap": "^3.2.0",
    "@astrojs/mdx": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.23.8",
    "yaml": "^2.6.0",
    "satori": "^0.12.0",
    "@resvg/resvg-js": "^2.6.2"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "eslint": "^9.13.0",
    "@typescript-eslint/parser": "^8.12.0",
    "@typescript-eslint/eslint-plugin": "^8.12.0",
    "vitest": "^2.1.4",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 3: astro.config.mjs**

```javascript
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://stardive.example.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), sitemap(), mdx()],
  vite: { plugins: [tailwindcss()] },
});
```

(`site`는 Task 10에서 실제 도메인으로 교체)

- [ ] **Step 4: apps/web/tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": { "~/*": ["./src/*"] }
  },
  "include": ["src/**/*", ".astro/types.d.ts"]
}
```

- [ ] **Step 5: src/styles/global.css + Tailwind v4 entry**

```css
@import "tailwindcss";

:root {
  --color-bg: #0b0d12;
  --color-fg: #e7ecf3;
  --color-accent: #7aa2ff;
}
html, body { background: var(--color-bg); color: var(--color-fg); }
```

- [ ] **Step 6: 최소 `src/pages/index.astro`**

```astro
---
const title = '몬길: STAR DIVE 팬사이트';
---
<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8" /><title>{title}</title></head>
  <body><main style="padding:2rem"><h1>{title}</h1><p>공사중 — 쿠폰/티어 곧 공개</p></main></body>
</html>
```

- [ ] **Step 7: pnpm install + 기동 확인**

```bash
pnpm install
pnpm --filter @stardive/web dev
```
Expected: `http://localhost:4321` 에서 "공사중" 노출. `Ctrl+C`로 종료.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: scaffold astro app with tailwind v4 + node adapter"
```

---

## Task 3: Content Collections + Zod 스키마 + YAML 로더

**Files:**
- Create: `apps/web/src/content/config.ts`
- Create: `content/coupons.yaml`
- Create: `content/seo/site.yaml`
- Create: `apps/web/src/content/coupons/index.yaml` (심볼릭이 어려우므로 파일 복사 스크립트 대신 Astro custom loader 사용)

실제로는 Astro Content Collections의 `glob`/`file` loader로 루트 `content/` 를 읽는다.

- [ ] **Step 1: content/seo/site.yaml**

```yaml
siteName: "몬길 스타다이브 팬사이트"
siteUrl: "https://stardive.example.com"
defaultDescription: "몬스터길들이기 STAR DIVE 쿠폰, 티어, 공략 — 실시간 팬 정보 허브"
ogImage: "/og/default.png"
twitterHandle: ""
```

- [ ] **Step 2: content/coupons.yaml (실제 데이터)**

```yaml
- code: LOVEMONGIL
  status: active
  rewards:
    - kind: architect
      name: "넘쳐흐르는 사랑 (프란시스 전용 무기)"
      qty: 1
  redemptionUrl: https://coupon.netmarble.com/monster2
  platformNotes: "iOS는 웹 쿠폰 사이트에서 입력"
  source: https://game.warkingmom.com/entry/몬길-스타-다이브-쿠폰-캐릭터-티어-등급표-리세마라-방법-추천-공략
  firstSeenAt: 2026-04-15
- code: Devlive0410
  status: active
  rewards:
    - { kind: ring, name: "스카", qty: 1 }
    - { kind: ring, name: "하얀늑대", qty: 1 }
    - { kind: ring, name: "슬라릿", qty: 1 }
  redemptionUrl: https://coupon.netmarble.com/monster2
  source: https://game.warkingmom.com/entry/몬길-스타-다이브-쿠폰-캐릭터-티어-등급표-리세마라-방법-추천-공략
  firstSeenAt: 2026-04-15
- code: MONGILDISCORD
  status: active
  rewards:
    - { kind: currency, name: "별빛 수정", qty: 30 }
    - { kind: material, name: "은은한 별빛 가루", qty: 3 }
    - { kind: gold, name: "골드", qty: 300000 }
  redemptionUrl: https://coupon.netmarble.com/monster2
  source: https://game.warkingmom.com/entry/몬길-스타-다이브-쿠폰-캐릭터-티어-등급표-리세마라-방법-추천-공략
  firstSeenAt: 2026-04-15
- code: DINDINISDINDIN
  status: active
  rewards:
    - { kind: ring, name: "쵸파", qty: 1 }
    - { kind: gold, name: "골드", qty: 10000 }
  redemptionUrl: https://coupon.netmarble.com/monster2
  source: https://game.warkingmom.com/entry/몬길-스타-다이브-쿠폰-캐릭터-티어-등급표-리세마라-방법-추천-공략
  firstSeenAt: 2026-04-15
- code: MONGILPRESENT
  status: active
  rewards:
    - { kind: ring, name: "쵸푸", qty: 1 }
    - { kind: ring, name: "포크머거", qty: 1 }
    - { kind: ring, name: "슬라릿", qty: 1 }
  redemptionUrl: https://coupon.netmarble.com/monster2
  source: https://game.warkingmom.com/entry/몬길-스타-다이브-쿠폰-캐릭터-티어-등급표-리세마라-방법-추천-공략
  firstSeenAt: 2026-04-15
- code: MONGILREPORT
  status: active
  rewards:
    - { kind: ring, name: "하얀 늑대", qty: 1 }
  redemptionUrl: https://coupon.netmarble.com/monster2
  source: https://game.warkingmom.com/entry/몬길-스타-다이브-쿠폰-캐릭터-티어-등급표-리세마라-방법-추천-공략
  firstSeenAt: 2026-04-15
- code: GSBGMONGIL
  status: active
  rewards:
    - { kind: ring, name: "쵸푸엉클", qty: 1 }
    - { kind: gold, name: "골드", qty: 10000 }
  redemptionUrl: https://coupon.netmarble.com/monster2
  source: https://game.warkingmom.com/entry/몬길-스타-다이브-쿠폰-캐릭터-티어-등급표-리세마라-방법-추천-공략
  firstSeenAt: 2026-04-15
```

- [ ] **Step 3: content/tier/reroll-2026-04-15.md**

```markdown
---
title: "몬길 스타다이브 리세마라 티어 (2026-04-15 출시 당일)"
version: "1.0.0"
publishedAt: 2026-04-15
context: "reroll"
summary: "출시일 기준 리셋마라 추천 조합 — 바람 암살+지원, 불 플레아/베르나 축"
---

## 현재 메타 요약
- **바람 속성** — 에스데(암살 딜러) + 지원형 서포터 조합이 시너지 최상
- **불 속성** — 플레아 + 베르나, 추후 미나 합류 가능

> 출처 및 상세 논의: [게임톡 프리뷰](https://www.gametoc.co.kr/news/articleView.html?idxno=107803), [인벤 리뷰](https://www.inven.co.kr/webzine/news/?news=310250)

## S 티어
- 에스데 (바람 / 암살)
- 플레아 (불 / 파괴)

## A 티어
- 베르나 (불 / 지원)
- (업데이트 예정)

*본 티어는 출시 당일 정보 기반 초안이며, 팬 커뮤니티 의견을 반영해 주기적으로 갱신됩니다.*
```

- [ ] **Step 4: apps/web/src/content/config.ts**

```typescript
import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';
import { parse as parseYaml } from 'yaml';

const rewardKind = z.enum(['currency', 'material', 'gold', 'ring', 'architect']);

const couponSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9]+$/),
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
    parser: (text) => parseYaml(text),
  }),
  schema: couponSchema,
});

const tier = defineCollection({
  loader: file('../../content/tier', { base: '../../content/tier' }),
  schema: z.object({
    title: z.string(),
    version: z.string(),
    publishedAt: z.coerce.date(),
    context: z.enum(['reroll', 'pve', 'boss', 'story', 'pvp']),
    summary: z.string(),
  }),
});

export const collections = { coupons, tier };
```

(주: `file` 로더가 array YAML을 지원하도록 `parser` 반환을 검증. 문서 찾을 수 없으면 glob+fs로 대체)

- [ ] **Step 5: 테스트 — 스키마 파싱 검증 (Vitest)**

`apps/web/src/content/__tests__/schema.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
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
    const raw = readFileSync(new URL('../../../../../content/coupons.yaml', import.meta.url), 'utf-8');
    const parsed = parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
    for (const c of parsed) couponSchema.parse(c);
    expect(parsed.length).toBeGreaterThanOrEqual(7);
  });
});
```

- [ ] **Step 6: Run test**

```bash
pnpm --filter @stardive/web test
```
Expected: PASS, 7+ 쿠폰 검증.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add coupon + tier content collections with zod validation"
```

---

## Task 4: BaseLayout + SEO 메타 헬퍼

**Files:**
- Create: `apps/web/src/layouts/BaseLayout.astro`
- Create: `apps/web/src/lib/seo.ts`
- Create: `apps/web/src/components/Nav.astro`

- [ ] **Step 1: src/lib/seo.ts**

```typescript
import site from '../../../content/seo/site.yaml';

export interface PageMeta {
  title: string;
  description?: string;
  canonical: string;
  ogImage?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
}

export function buildMeta(input: Omit<PageMeta, 'canonical'> & { path: string }): PageMeta {
  return {
    title: `${input.title} | ${site.siteName}`,
    description: input.description ?? site.defaultDescription,
    canonical: `${site.siteUrl}${input.path}`,
    ogImage: input.ogImage ?? `${site.siteUrl}${site.ogImage}`,
    type: input.type ?? 'website',
    jsonLd: input.jsonLd,
    noindex: input.noindex ?? false,
  };
}
```

(YAML import을 위해 Vite yaml plugin 필요: 다음 스텝에서 `@rollup/plugin-yaml` 또는 raw fs 로드로 대체. 단순화 위해 JSON으로 전환 가능 — 여기선 유지)

- [ ] **Step 2: Vite yaml 플러그인 추가**

`apps/web/package.json` devDependencies:
```
"@rollup/plugin-yaml": "^4.1.2"
```

`astro.config.mjs` vite 블록 업데이트:
```javascript
import yaml from '@rollup/plugin-yaml';
// ...
vite: { plugins: [tailwindcss(), yaml()] },
```

```bash
pnpm install
```

- [ ] **Step 3: src/components/Nav.astro**

```astro
---
const groups = [
  { label: '도감', href: '/characters', placeholder: true },
  { label: '공략', href: '/tier', placeholder: false },
  { label: '소식', href: '/coupons', placeholder: false },
  { label: '세계관', href: '/lore', placeholder: true },
];
const pathname = Astro.url.pathname;
---
<nav class="sticky top-0 z-40 backdrop-blur bg-black/60 border-b border-white/10">
  <div class="max-w-5xl mx-auto flex items-center gap-6 px-4 h-14">
    <a href="/" class="font-bold tracking-tight">스타다이브</a>
    <ul class="flex gap-4 text-sm">
      {groups.map(g => (
        <li>
          <a href={g.href}
             aria-current={pathname.startsWith(g.href) ? 'page' : undefined}
             class:list={[
               'px-2 py-1 rounded',
               pathname.startsWith(g.href) ? 'bg-white/10' : 'hover:bg-white/5',
               g.placeholder && 'text-white/40',
             ]}
          >{g.label}{g.placeholder && ' (곧)'}</a>
        </li>
      ))}
    </ul>
  </div>
</nav>
```

- [ ] **Step 4: src/layouts/BaseLayout.astro**

```astro
---
import '../styles/global.css';
import Nav from '../components/Nav.astro';
import type { PageMeta } from '../lib/seo';
interface Props { meta: PageMeta }
const { meta } = Astro.props;
---
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>{meta.title}</title>
    <meta name="description" content={meta.description} />
    <link rel="canonical" href={meta.canonical} />
    {meta.noindex && <meta name="robots" content="noindex" />}
    <meta property="og:type" content={meta.type} />
    <meta property="og:title" content={meta.title} />
    <meta property="og:description" content={meta.description} />
    <meta property="og:url" content={meta.canonical} />
    <meta property="og:image" content={meta.ogImage} />
    <meta name="twitter:card" content="summary_large_image" />
    {meta.jsonLd && <script type="application/ld+json" set:html={JSON.stringify(meta.jsonLd)} />}
  </head>
  <body>
    <Nav />
    <main class="max-w-5xl mx-auto px-4 py-8"><slot /></main>
    <footer class="max-w-5xl mx-auto px-4 py-12 text-xs text-white/40">
      © 2026 stardive-fan-site — 비공식 팬사이트. 「몬길: STAR DIVE」 © Netmarble.
    </footer>
  </body>
</html>
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: base layout with SEO meta helper and 4-group nav"
```

---

## Task 5: 쿠폰 페이지 + 복사 아일랜드

**Files:**
- Create: `apps/web/src/components/CopyButton.tsx`
- Create: `apps/web/src/components/Badge.astro`
- Create: `apps/web/src/components/CouponCard.astro`
- Create: `apps/web/src/pages/coupons.astro`

- [ ] **Step 1: CopyButton 단위 테스트**

`apps/web/src/components/__tests__/CopyButton.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CopyButton } from '../CopyButton';

describe('CopyButton', () => {
  it('클릭 시 navigator.clipboard.writeText 호출 후 "복사됨" 토글', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: write } });
    render(<CopyButton value="ABCDE" />);
    const btn = screen.getByRole('button', { name: /복사/ });
    await act(async () => { fireEvent.click(btn); });
    expect(write).toHaveBeenCalledWith('ABCDE');
    expect(screen.getByRole('button').textContent).toMatch(/복사됨/);
  });
});
```

추가 의존성:
```json
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.6.3",
"jsdom": "^25.0.1"
```

`apps/web/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
});
```

- [ ] **Step 2: Run test (should FAIL — 컴포넌트 없음)**

```bash
pnpm --filter @stardive/web test -- CopyButton
```
Expected: FAIL (module not found).

- [ ] **Step 3: CopyButton.tsx 구현**

```tsx
import { useState } from 'react';

export function CopyButton({ value, label = '복사' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-live="polite"
      className="px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors"
    >
      {copied ? '복사됨 ✓' : label}
    </button>
  );
}
```

- [ ] **Step 4: Run test — PASS**

```bash
pnpm --filter @stardive/web test -- CopyButton
```

- [ ] **Step 5: Badge.astro**

```astro
---
type Variant = 'active' | 'expired' | 'unknown' | 'limited' | 'permanent' | 'urgent' | 'scheduled';
interface Props { variant: Variant; children?: unknown }
const { variant } = Astro.props;
const styles: Record<Variant, string> = {
  active: 'bg-green-500/20 text-green-300 border-green-500/40',
  expired: 'bg-white/10 text-white/50 border-white/20',
  unknown: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  limited: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  permanent: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  urgent: 'bg-red-500/20 text-red-300 border-red-500/40',
  scheduled: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
};
---
<span class:list={['inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs', styles[variant]]}>
  <slot />
</span>
```

- [ ] **Step 6: CouponCard.astro**

```astro
---
import Badge from './Badge.astro';
import { CopyButton } from './CopyButton.tsx';

interface Reward { kind: string; name: string; qty: number }
interface Props {
  code: string;
  status: 'active' | 'expired' | 'unknown';
  rewards: Reward[];
  redemptionUrl: string;
  platformNotes?: string;
  source: string;
}
const { code, status, rewards, redemptionUrl, platformNotes, source } = Astro.props;
---
<article class="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-3">
  <header class="flex items-center justify-between gap-3">
    <code class="text-xl md:text-2xl font-mono font-bold tracking-wide">{code}</code>
    <Badge variant={status}>{status === 'active' ? '사용 가능' : status === 'expired' ? '만료' : '검증중'}</Badge>
  </header>
  <ul class="text-sm text-white/80 flex flex-wrap gap-x-4 gap-y-1">
    {rewards.map(r => (<li>{r.name} ×{r.qty.toLocaleString()}</li>))}
  </ul>
  <div class="flex items-center gap-2 mt-auto">
    <CopyButton client:load value={code} />
    <a href={redemptionUrl} target="_blank" rel="noreferrer"
       class="text-xs text-white/60 hover:text-white underline underline-offset-4">
      입력 사이트 →
    </a>
  </div>
  {platformNotes && <p class="text-xs text-white/50">{platformNotes}</p>}
  <a href={source} target="_blank" rel="noreferrer" class="text-[11px] text-white/30 hover:text-white/60 self-end">출처</a>
</article>
```

- [ ] **Step 7: src/pages/coupons.astro**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import CouponCard from '../components/CouponCard.astro';
import { buildMeta } from '../lib/seo';

const all = await getCollection('coupons');
const coupons = all.map(e => e.data).sort((a, b) => {
  if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
  return new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime();
});
const active = coupons.filter(c => c.status === 'active');
const inactive = coupons.filter(c => c.status !== 'active');

const meta = buildMeta({
  path: '/coupons',
  title: `몬길 스타다이브 쿠폰 ${new Date().getFullYear()} — 실시간 검증`,
  description: `몬스터길들이기 STAR DIVE 최신 쿠폰 ${active.length}개. 복사 한 번에 사용.`,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: active.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'Offer', name: c.code, url: c.redemptionUrl, availability: 'https://schema.org/InStock' },
    })),
  },
});
---
<BaseLayout meta={meta}>
  <h1 class="text-3xl md:text-4xl font-bold">쿠폰 코드</h1>
  <p class="mt-2 text-white/70">
    총 <strong>{active.length}개</strong> 사용 가능.
    <a class="underline" href="https://coupon.netmarble.com/monster2" target="_blank" rel="noreferrer">
      넷마블 쿠폰 입력 사이트
    </a>에서 코드 입력.
  </p>

  <section class="mt-6 grid gap-3 md:grid-cols-2" aria-label="사용 가능 쿠폰">
    {active.map(c => <CouponCard {...c} />)}
  </section>

  {inactive.length > 0 && (
    <details class="mt-10 border-t border-white/10 pt-6">
      <summary class="cursor-pointer text-white/70">만료/검증중 쿠폰 ({inactive.length})</summary>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        {inactive.map(c => <CouponCard {...c} />)}
      </div>
    </details>
  )}
</BaseLayout>
```

- [ ] **Step 8: dev 서버에서 /coupons 확인**

```bash
pnpm --filter @stardive/web dev
```
Expected: `http://localhost:4321/coupons` 에 7개 쿠폰 카드, 복사 버튼 동작.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: coupons page with sticky cards, copy island, JSON-LD offer"
```

---

## Task 6: 티어 페이지

**Files:**
- Create: `apps/web/src/pages/tier.astro`

- [ ] **Step 1: src/pages/tier.astro**

```astro
---
import { getCollection, render } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import { buildMeta } from '../lib/seo';

const entries = await getCollection('tier');
const latest = entries.sort((a, b) =>
  new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime()
)[0];
if (!latest) throw new Error('티어 문서가 content/tier에 없습니다');
const { Content } = await render(latest);
const d = latest.data;

const meta = buildMeta({
  path: '/tier',
  title: `${d.title}`,
  description: d.summary,
  type: 'article',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: d.title,
    datePublished: d.publishedAt,
    author: { '@type': 'Organization', name: 'stardive-fan-site' },
  },
});
---
<BaseLayout meta={meta}>
  <header class="mb-6">
    <h1 class="text-3xl md:text-4xl font-bold">{d.title}</h1>
    <p class="text-white/60 mt-2 text-sm">v{d.version} · {d.publishedAt.toISOString().slice(0,10)} · {d.context}</p>
    <p class="text-white/80 mt-4">{d.summary}</p>
  </header>
  <article class="prose prose-invert max-w-none">
    <Content />
  </article>
</BaseLayout>
```

- [ ] **Step 2: prose 스타일 — @tailwindcss/typography v4 호환**

`apps/web/src/styles/global.css` 끝에 추가:
```css
@plugin "@tailwindcss/typography";
```

`apps/web/package.json` devDependencies:
```
"@tailwindcss/typography": "^0.5.15"
```

```bash
pnpm install
```

- [ ] **Step 3: /tier 확인**

```bash
pnpm --filter @stardive/web dev
```
Expected: `/tier`에 "몬길 스타다이브 리세마라 티어" 렌더, 마크다운 정상.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: tier page rendering latest MDX snapshot"
```

---

## Task 7: 홈 페이지

**Files:**
- Modify: `apps/web/src/pages/index.astro`

- [ ] **Step 1: index.astro 전면 교체**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import CouponCard from '../components/CouponCard.astro';
import { buildMeta } from '../lib/seo';

const allCoupons = await getCollection('coupons');
const topCoupons = allCoupons.map(e => e.data)
  .filter(c => c.status === 'active')
  .sort((a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime())
  .slice(0, 3);

const tiers = await getCollection('tier');
const topTier = tiers.sort((a, b) =>
  new Date(b.data.publishedAt).getTime() - new Date(a.data.publishedAt).getTime()
)[0];

const meta = buildMeta({
  path: '/',
  title: '홈',
  description: '몬스터길들이기 STAR DIVE 쿠폰, 리세마라 티어, 공략을 한눈에.',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: '몬길: STAR DIVE',
    gamePlatform: ['Android', 'iOS', 'PC'],
    publisher: 'Netmarble',
    datePublished: '2026-04-15',
  },
});
---
<BaseLayout meta={meta}>
  <section class="py-8">
    <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight">
      몬길: STAR DIVE<br /><span class="text-sky-300">팬 정보 허브</span>
    </h1>
    <p class="mt-4 text-white/70 max-w-xl">
      오늘 출시된 「몬길: STAR DIVE」의 쿠폰·티어·공략을 실시간으로 정리합니다.
    </p>
  </section>

  <section class="mt-8">
    <div class="flex items-baseline justify-between">
      <h2 class="text-2xl font-bold">지금 쓸 수 있는 쿠폰</h2>
      <a href="/coupons" class="text-sm text-sky-300 hover:underline">전체 보기 →</a>
    </div>
    <div class="mt-4 grid gap-3 md:grid-cols-3">
      {topCoupons.map(c => <CouponCard {...c} />)}
    </div>
  </section>

  {topTier && (
    <section class="mt-12">
      <div class="flex items-baseline justify-between">
        <h2 class="text-2xl font-bold">리세마라 티어</h2>
        <a href="/tier" class="text-sm text-sky-300 hover:underline">자세히 →</a>
      </div>
      <p class="mt-3 text-white/80">{topTier.data.summary}</p>
    </section>
  )}
</BaseLayout>
```

- [ ] **Step 2: `/` 확인**

```bash
pnpm --filter @stardive/web dev
```
Expected: 홈에 쿠폰 3개 + 티어 요약 노출.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: homepage with top coupons and tier summary"
```

---

## Task 8: robots.txt + sitemap + /healthz

**Files:**
- Create: `apps/web/public/robots.txt`
- Create: `apps/web/src/pages/healthz.ts`
- Modify: `apps/web/astro.config.mjs` (sitemap 설정 확정)

- [ ] **Step 1: public/robots.txt**

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://stardive.example.com/sitemap-index.xml
```

- [ ] **Step 2: src/pages/healthz.ts**

```typescript
export const prerender = false;
export async function GET() {
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
```

- [ ] **Step 3: astro.config.mjs에서 sitemap filter로 /admin·/api 제외**

```javascript
sitemap({
  filter: (page) => !page.includes('/admin/') && !page.includes('/api/') && !page.includes('/healthz'),
}),
```

- [ ] **Step 4: 빌드 & sitemap 확인**

```bash
pnpm --filter @stardive/web build
ls apps/web/dist/client/sitemap-*.xml
```
Expected: sitemap-index.xml + sitemap-0.xml 생성.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: robots, sitemap filter, healthz endpoint"
```

---

## Task 9: OG 이미지 서버 렌더 (satori)

**Files:**
- Create: `apps/web/src/pages/api/og/default.png.ts`
- Create: `apps/web/src/pages/api/og/coupons.png.ts`
- Create: `apps/web/src/lib/og.ts`

- [ ] **Step 1: src/lib/og.ts**

```typescript
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';

const fontPath = new URL('../../../../node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-700-normal.woff', import.meta.url);
let fontCache: Buffer | null = null;
function font(): Buffer {
  if (!fontCache) fontCache = readFileSync(fontPath);
  return fontCache;
}

export async function renderOg(title: string, subtitle?: string): Promise<Buffer> {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '80px',
          background: 'linear-gradient(135deg, #0b0d12 0%, #1a2142 100%)',
          color: '#e7ecf3', fontFamily: 'Noto',
        },
        children: [
          { type: 'div', props: { style: { fontSize: 72, fontWeight: 700, lineHeight: 1.1 }, children: title } },
          subtitle && { type: 'div', props: { style: { fontSize: 36, marginTop: 24, color: '#7aa2ff' }, children: subtitle } },
          { type: 'div', props: { style: { marginTop: 'auto', fontSize: 28, color: '#7aa2ff' }, children: 'stardive-fan-site' } },
        ].filter(Boolean),
      },
    },
    {
      width: 1200, height: 630,
      fonts: [{ name: 'Noto', data: font(), weight: 700, style: 'normal' }],
    },
  );
  return new Resvg(svg).render().asPng();
}
```

의존성:
```
"@fontsource/noto-sans-kr": "^5.1.0"
```

- [ ] **Step 2: API 라우트**

`src/pages/api/og/default.png.ts`:
```typescript
import type { APIRoute } from 'astro';
import { renderOg } from '../../../lib/og';
export const prerender = false;
export const GET: APIRoute = async () => {
  const png = await renderOg('몬길: STAR DIVE', '팬 정보 허브');
  return new Response(png, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' } });
};
```

`src/pages/api/og/coupons.png.ts`:
```typescript
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg } from '../../../lib/og';
export const prerender = false;
export const GET: APIRoute = async () => {
  const active = (await getCollection('coupons')).filter(e => e.data.status === 'active').length;
  const png = await renderOg('쿠폰 코드', `${active}개 사용 가능 — 실시간 검증`);
  return new Response(png, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=600' } });
};
```

- [ ] **Step 3: content/seo/site.yaml 수정**

```yaml
ogImage: "/api/og/default.png"
```

- [ ] **Step 4: coupons.astro meta 수정 — 전용 OG**

`buildMeta` 호출에 `ogImage: '/api/og/coupons.png'` 추가.

- [ ] **Step 5: 확인**

```bash
pnpm --filter @stardive/web dev
curl -o /tmp/og.png http://localhost:4321/api/og/default.png
file /tmp/og.png
```
Expected: `PNG image data, 1200 x 630`.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: dynamic OG image rendering with satori"
```

---

## Task 10: Dockerfile + docker-compose + Caddy

**Files:**
- Create: `apps/web/Dockerfile`
- Create: `infra/docker-compose.yml`
- Create: `infra/Caddyfile`
- Create: `.dockerignore`

- [ ] **Step 1: .dockerignore**

```
**/node_modules
**/dist
**/.astro
**/.turbo
.git
.env
.env.local
```

- [ ] **Step 2: apps/web/Dockerfile**

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter @stardive/web build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /app/apps/web/dist ./dist
COPY --from=build /app/apps/web/package.json ./package.json
COPY --from=build /app/apps/web/node_modules ./node_modules
COPY --from=build /app/content ../content
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "./dist/server/entry.mjs"]
```

- [ ] **Step 3: infra/Caddyfile**

```caddy
{$SITE_DOMAIN} {
    encode zstd gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
    }
    @static path *.css *.js *.png *.webp *.svg *.woff2
    header @static Cache-Control "public, max-age=31536000, immutable"
    reverse_proxy web:3000
}
```

- [ ] **Step 4: infra/docker-compose.yml**

```yaml
services:
  web:
    build:
      context: ..
      dockerfile: apps/web/Dockerfile
    restart: unless-stopped
    expose: ["3000"]
    environment:
      NODE_ENV: production
    networks: [proxy]

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    environment:
      SITE_DOMAIN: ${SITE_DOMAIN}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks: [proxy]
    depends_on: [web]

networks:
  proxy: {}
volumes:
  caddy_data: {}
  caddy_config: {}
```

- [ ] **Step 5: 로컬 빌드 테스트**

```bash
cd /Users/jidong/workspace/side/stardive-fan-site
docker build -f apps/web/Dockerfile -t stardive-web:local .
docker run --rm -p 3000:3000 stardive-web:local &
sleep 3
curl -f http://localhost:3000/healthz
curl -fsI http://localhost:3000/coupons | head -1
docker ps --filter ancestor=stardive-web:local -q | xargs -r docker stop
```
Expected: healthz 200 OK, /coupons 200.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: dockerfile + caddy + compose for phase 0 deploy"
```

---

## Task 11: CI (GitHub Actions)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 워크플로우 작성**

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - name: Docker build smoke
        run: docker build -f apps/web/Dockerfile -t smoke .
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "ci: typecheck+test+build+docker smoke"
```

---

## Task 12: 배포 + 검증 체크리스트

**Files:** 없음 — 운영 작업

- [ ] **Step 1: 리포 푸시**

```bash
gh repo create stardive-fan-site --private --source=. --remote=origin --push
```

- [ ] **Step 2: VPS 접속 (Tailscale)**

```bash
ssh stardive-vps   # tailscale 설정된 alias
```

- [ ] **Step 3: 초기 배포**

```bash
cd /opt
git clone <repo-url> stardive-fan-site
cd stardive-fan-site/infra
SITE_DOMAIN=stardive.example.com docker compose up -d --build
```

- [ ] **Step 4: 확인**

```bash
curl -fsI https://stardive.example.com/healthz
curl -fs https://stardive.example.com/coupons | grep -o 'LOVEMONGIL'
curl -fs https://stardive.example.com/sitemap-index.xml | head -3
```

- [ ] **Step 5: Search Console 제출**

- Google Search Console에서 `https://stardive.example.com` 속성 추가 → sitemap-index.xml 제출
- `/coupons`, `/tier`, `/` URL 검사 → 색인 요청

- [ ] **Step 6: Commit (문서만)**

```bash
echo "# Deploy

초기 배포 완료 — $(date -u +%F). SITE_DOMAIN, Search Console 제출 완료.
" >> docs/DEPLOY.md
git add docs/DEPLOY.md
git commit -m "docs: record phase 0 deploy"
git push
```

---

## Phase 0 완료 정의 (Definition of Done)

- [ ] `https://<domain>/`, `/coupons`, `/tier` 200 응답
- [ ] `/healthz` 200 OK JSON
- [ ] robots.txt·sitemap-index.xml 접근 가능
- [ ] OG 이미지 `/api/og/default.png`, `/api/og/coupons.png` 각각 PNG 반환
- [ ] 복사 버튼 모바일/데스크탑 동작
- [ ] Lighthouse SEO/Performance > 90
- [ ] Search Console 색인 요청 제출
- [ ] CI 그린

## Next (Phase 1 플랜에서)

- Postgres + Drizzle + better-auth
- `/admin` CRUD (react-hook-form + zodResolver)
- Playwright 풀 SPA 크롤러 (5.3)
- pg-boss 쿠폰 30분 폴링
- 캐릭터/링/아키텍트/로어/에피소드/패치 풀 도감
- AuditLog 파티셔닝 + pg_dump 백업 cron
