# stardive-fan-site 배포 가이드

**전제**: 서버에 `yohan-server-infra`가 이미 기동 중 (Caddy + PostgreSQL + `side-project-network`).

---

## 도메인

- **프론트엔드**: `mongil.peo.kr` → `mongil-web:3000` (Astro SSR)
- **API (Phase 1 예정)**: `mongil-api.peo.kr` → `mongil-api:3001`

---

## 1) DNS

도메인 공급자 (peo.kr 관리 패널)에서 아래 A 레코드 추가:

| 호스트 | 타입 | 값 | TTL |
|---|---|---|---|
| `mongil` | A | `<서버 공용 IP>` | 300 |
| `mongil-api` | A | `<서버 공용 IP>` | 300 |

전파 확인: `dig mongil.peo.kr +short` → 서버 IP 반환되어야 함.

---

## 2) Caddy 설정 추가

`yohan-server-infra/caddy/sites/` 에 사이트 파일 복사:

```bash
# Phase 0: 프론트엔드만
cp stardive-fan-site/infra/caddy/mongil.peo.kr.caddy yohan-server-infra/caddy/sites/

# Phase 1 때: API도 추가 (mongil-api 컨테이너 기동 후에만)
# cp stardive-fan-site/infra/caddy/mongil-api.peo.kr.caddy yohan-server-infra/caddy/sites/
```

**mongil-api.peo.kr.caddy는 Phase 1에서 mongil-api 컨테이너 기동 후 복사.** 지금 넣으면 502.

설정 적용 (무중단 리로드):
```bash
docker exec caddy-proxy caddy reload --config /etc/caddy/Caddyfile
```

---

## 3) stardive-fan-site 배포

서버에 리포 클론 후 빌드 + 기동:

```bash
# 예시 경로 — 본인 서버 관례에 맞춰 조정
cd /opt/side
git clone <리포-URL> stardive-fan-site
cd stardive-fan-site/infra

# 컨테이너 빌드 + 기동
docker compose up -d --build

# 로그 확인
docker logs -f mongil-web
```

컨테이너 상세:
- 이름: `mongil-web`
- 내부 포트: 3000 (Caddy가 reverse proxy)
- 네트워크: `side-project-network` (외부, yohan-server-infra가 소유)
- 헬스체크: 내장 (`/healthz`)

---

## 4) 검증

```bash
# 컨테이너에서 직접 확인
docker exec caddy-proxy wget -qO- http://mongil-web:3000/healthz
# 응답: {"ok":true,"ts":...}

# 도메인 HTTPS 확인 (인증서 발급 후 1–2분 뒤)
curl -fsI https://mongil.peo.kr/healthz
curl -fs  https://mongil.peo.kr/coupons | grep -o 'LOVEMONGIL'
curl -fs  https://mongil.peo.kr/sitemap-index.xml | head -3
```

모두 200 OK / 예상 내용 반환되면 배포 성공.

---

## 5) SEO 제출

1. [Google Search Console](https://search.google.com/search-console) → 속성 추가 → `https://mongil.peo.kr`
2. DNS TXT 레코드 또는 HTML 태그로 소유권 검증
3. Sitemap 제출: `sitemap-index.xml`
4. 주요 URL 개별 색인 요청:
   - `/`
   - `/coupons`
   - `/tier`
   - `/characters`
   - `/artifacts`
   - `/guides`
   - `/characters/mina` (샘플 캐릭터 상세)
5. [Naver Search Advisor](https://searchadvisor.naver.com) 에도 동일 제출 (국내 게이머 타겟)

---

## 6) 업데이트 배포

```bash
cd /opt/side/stardive-fan-site
git pull
cd infra
docker compose up -d --build mongil-web
# 자산만 바뀌고 코드 안 바뀌면 --build 생략 가능
```

**무중단이 아님** — 빌드 중 몇 초간 502 가능. Phase 1에서 blue/green 전략 도입 예정.

---

## Phase 1 예정 작업 (나중)

1. Postgres DB/유저 생성 (yohan-server-infra의 postgres-db 재사용):
   ```bash
   docker exec -it postgres-db psql -U postgres -c "
     CREATE DATABASE stardive;
     CREATE USER stardive WITH PASSWORD '...';
     GRANT ALL PRIVILEGES ON DATABASE stardive TO stardive;
   "
   ```
2. `.env` 작성 (DATABASE_URL, AUTH_SECRET, OAuth 키 등)
3. `docker-compose.yml` 의 `mongil-api` / `mongil-worker` 주석 해제
4. Caddyfile 의 `mongil-api.peo.kr` 블록 주석 해제 → reload

---

## 트러블슈팅

### `mongil-web` 컨테이너가 Caddy에서 찾지 못함
```bash
docker network inspect side-project-network | grep -A2 mongil-web
```
두 컨테이너가 동일 네트워크에 있는지 확인. 없다면 재기동.

### HTTPS 인증서 발급 실패
```bash
docker logs caddy-proxy 2>&1 | grep -i "mongil\|acme\|error"
```
DNS 전파 미완료가 주 원인. 전파 확인 후 `docker exec caddy-proxy caddy reload` 재실행.

### 500 / 502 응답
```bash
docker logs mongil-web --tail 100
# content/ 파일 경로 문제, seo.yaml 로드 실패 등 확인
```

### 컨테이너 들어가서 상태 체크
```bash
docker exec -it mongil-web sh
wget -qO- http://127.0.0.1:3000/healthz
ls /app/content
```

---

## 파일 체크리스트

배포 전 아래 파일 URL이 mongil.peo.kr 로 되어 있는지 확인:
- `apps/web/astro.config.mjs` → `site`
- `content/seo/site.yaml` → `siteUrl`
- `apps/web/public/robots.txt` → `Sitemap`
