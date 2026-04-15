# 몬길: STAR DIVE 팬사이트 설계 문서 (v2)

- **작성일:** 2026-04-15 (게임 출시일)
- **프로젝트:** `stardive-fan-site`
- **리포:** `/Users/jidong/workspace/side/stardive-fan-site`
- **상태:** v2 — 리뷰 반영본 (CEO/EM/DX/DBA/Design 5개 관점 피드백 통합)

---

## 0. 변경 로그 (v1→v2)

- **Phase 0 신설** (48시간 런칭 타깃: 쿠폰 + 리롤 티어)
- **Hono·Redis·BullMQ 제거** (Astro API routes + pg-boss)
- **Auth.js v5 → better-auth** (Astro 통합 성숙도)
- `jsonb` 남용 정규화, enum → lookup 테이블
- 관찰성(pino + OTel + RUM), DX 도구(bootstrap, 프리뷰, crop) 추가
- UX: 4그룹 IA, 배지 토큰, OG 자동생성, JSON-LD

---

## 1. 목적·전략·성공지표

### 1.1 목적
2026-04-15 출시한 넷마블 「몬길: STAR DIVE」한국 팬 정보 허브. 구글 오가닉 트래픽 견인(쿠폰·리롤·티어) → 단계적 도감·세계관 확장 → 장기 커뮤니티.

### 1.2 성공지표 (2026-05-15 기준)
- `/coupons` 월 10,000 세션 (출시일 Google 선점이 핵심)
- 핵심 페이지 Core Web Vitals 전부 Good
- 보안 인시던트 0
- 관리자 캐릭터 등록 1명당 10분 이내

### 1.3 3단계 런칭

| Phase | 기간 | 산출물 | 스택 최소선 |
|---|---|---|---|
| **0 — 런칭 스파이크** | 24–48h | `/coupons`, `/tier` 정적 페이지 | Astro + Markdown/YAML content. DB·Auth·Worker 없음. |
| **1 — 도감·세계관** | 2–3주 | 캐릭터/링/아키텍트/로어/에피소드/패치, `/admin`, **Playwright 풀 SPA 크롤러** | Postgres + Drizzle + better-auth + Playwright + pg-boss |
| **2 — 커뮤니티** | 이후 | 유저 로그인, 댓글, 게시판 | user role 승격, 신고·모더레이션 |

Phase 0는 스택 복잡도 없이 오늘 밤 배포 가능해야 함. 1인 운영 Time-to-market 최우선.

### 1.4 비목표 (YAGNI)
실시간, DM, 알림, 업적, 다국어, 네이티브, 유저 편집 위키, 엔터프라이즈 SSO, 사설 블로그, 유료 구독.

---

## 2. 기술 스택

| 레이어 | 선택 | 비고 |
|---|---|---|
| 프론트 | **Astro 5** (Node adapter, SSR) + React 19 아일랜드 | |
| 스타일 | Tailwind v4 + shadcn/ui (아일랜드 전용) | |
| **API** | **Astro API routes** (`src/pages/api/*.ts`) — Hono 제거 | Zod + Drizzle 직접 |
| ORM | Drizzle ORM | |
| DB | **PostgreSQL 16** | |
| **큐** | **pg-boss** (Postgres 기반) — Redis 제거 | 작업 이력·재시도·스케줄 내장 |
| 크롤러 | **Playwright** (worker) | headed/debug env 토글 |
| 인증 | **better-auth** (Google + Discord) — Auth.js 대체 | **JWT 세션 (Postgres 세션 hot row 회피)** |
| 검증 | Zod | `drizzle-zod`로 스키마 파생 |
| 스토리지 | 로컬 볼륨 → **Cloudflare R2** | 이미지 일일 동기화 |
| 오케스트레이션 | **Coolify** (자체호스팅 PaaS) | |
| 리버스프록시 | Caddy (자동 TLS, Coolify 내장) | |
| 관측성 | **pino** JSON 로그 + **OpenTelemetry** (SigNoz 셀프호스팅) + **web-vitals** RUM | |
| 에러 | **Glitchtip** (경량 Sentry 호환) | 셀프호스팅 |
| 업타임 | Uptime Kuma | |
| 관리 접속 | **Tailscale** only (공개 SSH 없음) | |
| CI | GitHub Actions → Coolify webhook | |
| 모노레포 | Turborepo + pnpm | |

### 2.1 토폴로지
```
Internet ─443─► Caddy ─► apps/web (Astro SSR :3000, API routes 포함)
                                   │
                                   ▼
                        PostgreSQL 16 ◄── apps/worker (pg-boss + Playwright)
```
Redis·Hono·apps/api 컨테이너 없음.

### 2.2 모노레포 구조 (슬림화)
```
stardive-fan-site/
├─ apps/
│  ├─ web/         Astro + API routes + /admin UI
│  └─ worker/      pg-boss 잡 + Playwright
├─ packages/
│  ├─ db/          Drizzle 스키마·마이그레이션·시드 (단방향 런타임)
│  └─ shared/      Zod·상수·순수 타입 (pg 드라이버 의존 금지)
├─ infra/
│  ├─ docker-compose.yml
│  ├─ coolify/
│  └─ scripts/     bootstrap.ts, backup.sh, seed
├─ content/        Phase 0: MD/YAML 정적 컨텐츠 (coupons.yaml, tier.md)
├─ docs/superpowers/specs/
└─ turbo.json
```

의존 규칙: `db → shared` 단방향. `web/worker`는 `db`·`shared` 참조. `shared`는 순수 ESM.

---

## 3. 도메인 모델 (정규화본)

### 3.1 lookup 테이블 (enum 대체)
- `element(code, name_ko, icon_url, sort)` — fire/ice/earth/wind/thunder
- `style(code, name_ko)` — brawler/destroyer/assassin/support
- `rarity(code, name_ko, order)` — R/SR/SSR
- `guide_category(code, name_ko)` — beginner/reroll/tier/team-comp/…
- `lore_kind(code, name_ko)` — region/race/faction/npc/event/glossary/timeline
- `coupon_status(code, label_ko)` — active/expired/unknown
- `reward_kind(code, name_ko)` — currency/ring/architect/gold/material

enum 유지: `user.role` (admin/user/moderator) 만.

### 3.2 주요 테이블

**character**
```
id BIGSERIAL PK
slug TEXT UNIQUE CHECK (slug ~ '^[a-z0-9-]+$')
name_ko TEXT NOT NULL
name_en TEXT
element_code TEXT NOT NULL REFERENCES element
style_code TEXT NOT NULL REFERENCES style
rarity_code TEXT NOT NULL REFERENCES rarity
tag_skill_name TEXT
bloom_max SMALLINT DEFAULT 6
release_episode_id BIGINT REFERENCES episode
illustration_url TEXT
portrait_url TEXT
is_limited BOOLEAN DEFAULT false
is_published BOOLEAN DEFAULT false
pending_update JSONB              -- 크롤러가 감지한 변경 diff (관리자 검토용, 덮어쓰기 금지)
last_crawled_at TIMESTAMPTZ
deleted_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()

tsv GENERATED ALWAYS AS (to_tsvector('simple', name_ko || ' ' || coalesce(name_en,''))) STORED

UNIQUE (slug) WHERE deleted_at IS NULL
```

**character_skill** (normal_skills jsonb 정규화)
```
id, character_id FK, ord SMALLINT, name TEXT, description_md TEXT,
cooldown_sec INT?, unlock_bloom SMALLINT?
```

**character_stat_row** (base_stats 는 입력 안정적이므로 jsonb 유지 허용)
```
character_id FK, bloom SMALLINT, hp INT, atk INT, def INT, spd INT,
PK(character_id, bloom)
```
→ 블룸 슬라이더 UX 직접 대응.

**monster_ring**, **architect** — 유사 구조 (동일하게 `pending_update`, `last_crawled_at` 포함). `architect.exclusive_character_id` FK nullable.

**episode** (number unique, title, summary_md, released_at, is_main_story, cover_url)

**patch_note** (slug unique, version, title, body_md, released_at, official_url, category_code)

**guide** (slug unique, title, category_code FK, body_md, tier_data jsonb?, author_user_id FK, published_at, is_published, deleted_at)

**coupon** — rewards를 jsonb에서 분리
```
id, code TEXT UNIQUE,
status_code TEXT REFERENCES coupon_status,
platform_notes TEXT,
redemption_url TEXT,
source_url TEXT,
first_seen_at, expires_at?, last_verified_at,
deleted_at
```

**coupon_reward** (쿠폰 보상 정규화)
```
id, coupon_id FK, reward_item_id FK, qty INT
INDEX (coupon_id), INDEX (reward_item_id)
```

**reward_item** (id, slug, name_ko, kind_code FK, icon_url)

**lore_entry** (id, slug, title, kind_code FK, summary, body_md, parent_id self-FK, cover_image_url, display_order, is_published, deleted_at)

**entity_source_url** (polymorphic 출처 링크)
```
id, entity_type SMALLINT, entity_id BIGINT, url TEXT, label TEXT, fetched_at TIMESTAMPTZ
INDEX (entity_type, entity_id)
```

**taggable** (polymorphic 태그)
```
tag_id FK, entity_type SMALLINT, entity_id BIGINT
PK (tag_id, entity_type, entity_id)
INDEX (entity_type, entity_id)
```

**entity_related** (캐릭터 ↔ 링/아키텍트/로어 관련성, 배치 로드)
```
from_type, from_id, to_type, to_id, relation_code
```

**user / session / account** — better-auth 표준. 세션은 **JWT** 전략 (Postgres hot UPDATE 회피).

**audit_log** — 월별 파티셔닝
```
id, actor_user_id FK, action TEXT, entity_type SMALLINT, entity_id BIGINT,
diff jsonb, ip INET, user_agent TEXT,
created_at TIMESTAMPTZ NOT NULL
PARTITION BY RANGE (created_at)   -- 월별 자동 생성, 90일+는 detach
```

**ingestion_job**
```
id, kind TEXT, status TEXT, target_url TEXT, payload jsonb,
error TEXT?, trace_zip_url TEXT?, started_at, finished_at
INDEX (kind, started_at DESC), INDEX (status) WHERE status='failed'
```

### 3.3 인덱스 정책
- 모든 FK 컬럼: 명시적 인덱스 (PG 자동 X)
- `coupon`: `(status_code, expires_at NULLS LAST, last_verified_at DESC)` 복합
- 풀텍스트: `tsv` GIN 인덱스 on character/guide/lore
- 공개 리스트: `character(is_published, rarity_code, element_code) WHERE deleted_at IS NULL` 부분 인덱스

### 3.4 삭제 정책
- `deleted_at IS NOT NULL` = tombstone
- `UNIQUE(slug) WHERE deleted_at IS NULL` 부분 유니크 — 재사용 가능
- 모든 FK는 `ON DELETE RESTRICT`, 실삭제는 관리자 UI에서 cascade 수동 선택

---

## 4. 라우트 구조 + UX 규격

### 4.1 글로벌 IA (4그룹)
하단 탭(모바일)·탑 내비(데스크탑):
- **도감** — 캐릭터 / 몬스터링 / 아키텍트
- **공략** — 가이드 / 티어
- **소식** — 패치 / 쿠폰 / 에피소드
- **세계관** — 로어 허브

`/coupons`는 홈 최상단 고정 배너로 추가 진입.

### 4.2 공개 라우트
- `/` — 히어로 + active 쿠폰 3 + 최신 패치 3 + 추천 가이드 3
- `/coupons` — **스티키 active 카드 리스트**, 코드 tap→복사+토스트+redemption_url 딥링크, expired accordion, JSON-LD `Offer`, SEO 타이틀 패턴 "몬길 쿠폰 2026년 X월 — 실시간 검증"
- `/tier` — 최신 tier_data 스냅샷, 맥락 탭(PvE/보스/스토리), OG 자동생성(상위 티어 일러스트)
- `/characters` — 속성/스타일/등급 필터 (Phase 0엔 없음)
- `/characters/[slug]` — 퍼스트뷰는 일러스트+이름+배지 바(속성/스타일/등급/티어). 스티키 탭: 스킬 / 스탯(블룸 슬라이더) / 추천링·아키텍트 / 로어
- `/rings`, `/rings/[slug]` — 유사
- `/architects`, `/architects/[slug]` — 유사, 전용 캐릭터 링크
- `/guides`, `/guides/[slug]` — MDX 렌더
- `/patches`, `/patches/[version]`
- `/lore` (kind 탭), `/lore/[kind]/[slug]`
- `/episodes` — 타임라인 스크롤

### 4.3 관리자 (`/admin/*`)
- `/admin` 대시보드 — 대기 쿠폰, 실패 ingestion, 최근 audit
- `/admin/{entity}` CRUD — react-hook-form + zodResolver, **"직전 항목 복제" 버튼**, react-image-crop → sharp(512/1024 webp), 발행 토글
- `/admin/ingest` — URL 붙여넣기 수동 크롤 + 실패 작업 re-run CLI
- `/admin/preview/[entity]/[slug]?token=...` — `is_published=false` SSR, noindex, 단수명 JWT 토큰, OG/모바일 iframe 분할뷰, **OG 썸네일 서버 렌더 프리뷰**
- `/admin/audit`

### 4.4 UX 토큰 표준
- 속성 아이콘·색 모두 필수 (색약 대응): fire/ice/earth/wind/thunder 고유 SVG + 라벨
- 배지:
  - 쿠폰 상태: active=green / expired=gray / unknown=amber
  - 캐릭터 availability: limited=purple / permanent=blue
  - 패치 긴급도: urgent=red / scheduled=blue
- 엠프티 스테이트 표준 3패턴: 필터-해제-CTA / 관련-추천-3 / 미등록-알림신청
- 모바일 테이블: md↓에서 카드 레이아웃 자동 전환 (key-value 스택)

### 4.5 SEO
- 페이지 타입별 메타 템플릿 (타이틀·설명·OG 1200×630 자동생성)
- 구조화 데이터: `VideoGame`(홈) / `Article`(가이드·패치) / `Offer`(쿠폰)
- sitemap.xml 자동, robots.txt에 `/admin` disallow
- i18n 없음 (ko-KR only, `<html lang="ko">`)

### 4.6 캐싱
- 공개 페이지 SSR + `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`, 관리자 mutation 시 파생 경로 PURGE
- 이미지 R2 → Cloudflare CDN, 1년 immutable
- 관리자: `no-store` + `X-Robots-Tag: noindex`

---

## 5. 수집(Ingestion) 파이프라인

### 5.1 원칙
1. **Playwright로 SPA 전면 자동 크롤** — 공식 사이트가 JS 렌더라도 `waitForLoadState('networkidle')` + 특정 셀렉터 대기로 완전 수집
2. 자동 수집은 **초안(`is_published=false`)으로만 저장**. 관리자 `/admin` 검토 → 요약/재작성 → 발행. 저작권 경계는 발행 단계에서 조절.
3. **구조화 필드(속성·등급·스탯·스킬명)는 원문 그대로 저장 허용**, **서술형 설명·로어 원문은 요약만 저장**
4. 이미지는 `<img src>` 추출 → worker가 다운로드 → sharp 재인코딩 → R2 업로드, `entity_source_url`에 원 URL·`fetched_at` 기록 (attribution)
5. 가드레일: UA 명시("StardiveFansiteBot"), robots.txt 존중, 도메인별 rate (공식 0.5 req/s, 블로그 0.2 req/s), 화이트리스트 도메인만, ETag/Last-Modified 캐시로 재요청 감축

### 5.2 쿠폰 파이프라인
- 대상: `coupon.netmarble.com/monster2` + 큐레이션 블로그 (TOS 사전 확인)
- 스케줄: pg-boss repeatable 30분
- 처리: Playwright → DOM 파싱 → 신규 코드 `status='unknown'` upsert → Discord 웹훅 관리자 DM
- 실패 시 trace.zip + DOM HTML 스냅샷 R2 업로드 → `/admin/ingest`에서 링크

### 5.3 캐릭터·세계관 풀 크롤러 (신규)
- 대상: `stardive.netmarble.com/ko` 의 `/characters/*`, `/world/*`, `/media/*` SPA 페이지
- Playwright 절차:
  1. `page.goto(url, { waitUntil: 'networkidle' })`
  2. 캐릭터 목록 컨테이너 셀렉터 대기 (`data-testid` 없으면 구조 기반 fallback)
  3. 무한스크롤·라우터 네비게이션은 `page.evaluate(() => window.__NEXT_DATA__/__NUXT__ 등)` 으로 내부 데이터 직접 추출 시도, 실패 시 DOM 긁기
  4. 각 캐릭터 상세 페이지 진입 → 일러스트 URL, 속성/스타일, 스킬 테이블, 설명 텍스트 추출
  5. 이미지 동시에 `fetch` → sharp 재인코딩 → R2
- 저장: `character/monster_ring/architect/lore_entry` 초안 upsert by slug. 기존 수정본 있으면 **diff만 `pending_update` 필드**에 보관(덮어쓰기 금지)
- 스케줄: 주 1회 full + 패치노트 감지 시 on-demand 트리거
- 변경 감지: 이전 크롤 payload hash와 비교, 변경된 필드만 관리자 알림

### 5.4 패치 파이프라인
- 공식 공지 페이지 Playwright 폴링(10분)
- **제목·URL·썸네일·released_at**만 저장. 본문 원문은 저장 금지 — 관리자가 요약 작성
- 신규 감지 시 캐릭터 크롤러 on-demand 트리거 (패치로 신규 캐릭터 추가되는 경우 대응)

### 5.5 수동 크롤 트리거
- `/admin/ingest` URL 입력 → worker가 Playwright로 페이지 렌더 + 스크린샷 + 메타 추출 → 편집 화면 프리필

### 5.6 재현·디버그 CLI
`pnpm --filter worker crawl:repro <jobId>` — `PWDEBUG=1 SLOWMO=250 HEADED=1` env 토글, `ingestion_job.payload` 재주입, trace.zip을 `npx playwright show-trace`로 열람

### 5.7 법적·윤리 가드
- 공식 사이트 ToS·robots.txt 준수, 오프시즌엔 스케줄 주기 늘림
- 크롤 대상 리스트는 `content/crawl-allowlist.yaml`에 버전 관리
- 출시사에서 중단 요청 시 즉시 kill-switch (`ENV CRAWL_KILL=1`로 pg-boss 잡 전체 정지)
- 발행 컨텐츠에 "정보 출처: 공식 사이트" 링크 필수 (`entity_source_url` 기반 자동 렌더)

---

## 6. 인증·권한·보안

### 6.1 better-auth 구성
- Provider: Google + Discord
- 세션: **JWT** (쿠키 httpOnly/Secure/SameSite=Lax, 15분 + refresh 30일 rotation)
- Phase 1: `.env` `ADMIN_EMAILS`/`ADMIN_DISCORD_IDS` 화이트리스트가 `/admin/*` 미들웨어 통과 조건
- Phase 2: 화이트리스트 제거, `user.role='admin'` DB 승격으로 전환 (마이그레이션 1회)

### 6.2 애플리케이션 보안
- Zod로 모든 API 입력 검증, 에러는 내부 스택트레이스 로그만 + 유저엔 일반화 메시지
- 업로드: 관리자만, MIME 화이트리스트(image/png|jpeg|webp), sharp re-encode(EXIF strip, SVG 차단)
- XSS: `body_md` 렌더 시 rehype-sanitize (marked+DOMPurify 조합)
- CSRF: better-auth 내장 + mutation 토큰 헤더
- Rate limit: Astro 미들웨어 (LRU + 슬라이딩 윈도우) — 공개 60 req/min, /admin 10 req/min, ingest 2 req/min
- CSP: `script-src 'self' 'strict-dynamic' nonce-{r}`, `img-src 'self' data: https://{r2.domain}`

### 6.3 인프라 보안
- Tailscale로 VPS 관리 접속, 22번 공개 닫음
- UFW/nftables: 80/443만 공개, Postgres는 Docker 내부 네트워크 only
- Coolify 기본 보안 헤더(HSTS, X-Frame-Options, Referrer-Policy) 상속
- fail2ban: Caddy 로그 기반
- 의존성: Renovate 봇 + `pnpm audit` CI + socket.dev 선택 스캔

---

## 7. 데이터 운영

### 7.1 마이그레이션 (expand/contract)
- `drizzle-kit generate` → SQL 리뷰 → 커밋
- 배포 훅 순서: **pg_dump pre-backup → migrate → 헬스체크 → 트래픽 스왑**. 헬스체크 실패 시 이전 컨테이너 유지
- **Breaking change는 2-phase**: ① 확장 마이그(컬럼 추가, 양쪽 쓰기) → ② 코드 교체 → ③ 축소 마이그(옛 컬럼 drop)
- 컬럼 drop은 항상 별도 PR

### 7.2 백업
- `pg_dump | gzip | age(공개키 암호화) | rclone R2` 일일 cron
- 보관 30일 (R2 라이프사이클)
- **월 1회 복구 리허설 스크립트** — 랜덤 백업 restore → smoke test → 삭제

### 7.3 로컬 개발 부트스트랩
`pnpm bootstrap` = ① docker compose up (pg) → ② drizzle migrate → ③ seed (content/*.yaml + packages/db/seed/) → ④ .env.example → .env.local 복사 가이드 → ⑤ `pnpm dev`(turbo 병렬)
`.env.example` 필수: DATABASE_URL, GOOGLE/DISCORD OAuth, R2 키, ADMIN_EMAILS, SESSION_JWT_SECRET

### 7.4 초기 시드 방식
- `content/seed/characters.yaml` 등 YAML(주석·멀티라인 유리)
- `packages/db/seed/run.ts` — 읽기 → Zod 검증 → Drizzle **idempotent upsert by slug**
- 이미지는 `content/seed/assets/{slug}.webp` → R2 업로드 스크립트

---

## 8. 테스트 전략 (비용 순)

| 우선 | 유형 | 범위 |
|---|---|---|
| 1 | Unit (Vitest) | Zod 스키마, Drizzle 쿼리 빌더 유틸, 쿠폰 파서 |
| 2 | Integration (Testcontainers + Postgres) | 관리자 CRUD 2-3개, 쿠폰 API |
| 3 | E2E (Playwright) | 쿠폰 복사, 캐릭터 필터→상세, /admin 로그인 CRUD 1개 |
| 4 | Lighthouse CI | warning(회귀 감지), blocker 아님 |
| 5 | axe-core | E2E에 통합 |

초기 커버리지 목표: 비즈니스 로직·쿠폰 파서 80%.

---

## 9. 관측성

- **로그**: pino JSON stdout → Loki 옵션 (없으면 `docker logs`). 요청 ID 전파
- **메트릭·트레이스**: OpenTelemetry SDK `@opentelemetry/auto-instrumentations-node` → 셀프호스팅 **SigNoz**
- **RUM**: `web-vitals` → `/api/rum` 엔드포인트 → DB 일별 롤업
- **에러**: Glitchtip
- **업타임**: Uptime Kuma 1분 간격 `/healthz`
- 핵심 KPI 대시보드: LCP p75, INP p75, ingestion 성공률, 쿠폰 신규 감지 지연

---

## 10. 보안·런칭 체크리스트

- [ ] Tailscale only, 공개 SSH 없음
- [ ] UFW 443/80만 노출, DB는 docker 내부만
- [ ] better-auth JWT, httpOnly/Secure/SameSite=Lax
- [ ] 관리자 화이트리스트 env 검증
- [ ] Zod 입력 전수 검증
- [ ] rehype-sanitize 렌더
- [ ] CSP nonce
- [ ] 업로드 sharp re-encode
- [ ] pg_dump age 암호화 R2 + 복구 리허설 스크립트 존재
- [ ] Renovate + pnpm audit CI 그린
- [ ] audit_log 모든 mutation 커버
- [ ] OG 이미지 생성기 동작
- [ ] sitemap.xml 배포됨, robots.txt `/admin` disallow

---

## 11. 오픈 이슈

1. **Astro + better-auth 실전 레퍼런스** — Phase 0–1 사이에 인증 스파이크 1일 확보해 OAuth 콜백·admin 미들웨어 검증
2. **저작권 경계** — 공식 이미지 재업로드·설명 재작성 범위. 출시사 정책 정독 후 `docs/legal.md` 작성 + `content/crawl-allowlist.yaml` 초안
3. **공식 사이트 DOM 변경 내성** — SPA 구조가 자주 바뀔 수 있음. 내부 데이터(`__NEXT_DATA__` 등) 우선 추출 전략 + 구조적 셀렉터 fallback. 크롤 실패 시 즉시 관리자 알림 + DOM 스냅샷
4. **쿠폰 만료 자동 판정** — redeem 실패 감지 없어 수동 verify에 의존. Phase 2에 "유저 제보 플래그" 도입 검토
5. **티어표 멀티-맥락** — `guide.tier_data jsonb`가 한계 오면 별도 `tier_snapshot` 테이블로 분리
6. **Phase 0 vs Phase 1 경계** — Phase 0 MD 컨텐츠를 Phase 1 DB로 마이그 시 URL 보존 필수(슬러그 고정)
