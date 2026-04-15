# 공식 사이트 분석 — stardive.netmarble.com/ko

- 수집일: 2026-04-15 (출시 당일)
- 방법: Chrome DevTools MCP로 실제 렌더링된 페이지 직접 관찰·스크립트 주입
- 스크린샷: `ref/01-desktop-full.png` (3270×1756), `ref/02-mobile-full.png` (2800×1688)

팬사이트가 "공식과 같은 톤 가족"을 잇되 편집 밀도로 차별화하려면 다음 사항을 내재화해야 한다.

---

## 1. 기술 스택 (관찰된 것)

| 레이어 | 관찰값 |
|---|---|
| 프레임워크 | **Nuxt.js (Vue 3)** — `data-n-head`, `data-fetch-key`, SFC scoped styles (`data-v-*`) |
| 번들링 | Webpack/Vite (해시된 CSS·JS 파일명) |
| 캐러셀 | **Swiper.js** (`main-swiper`, vertical orientation, 21 슬라이드) |
| 스크롤 반응 | `.intersect` 클래스 — IntersectionObserver 기반 진입 애니메이션 |
| 배경 연출 | `<video autoplay loop muted playsinline>` 3개 (Netmarble CDN mp4), `mix-blend-mode: screen`/`overlay`로 합성 |
| 이미지 포맷 | PNG + JPG 위주, WebP 미사용, 아이콘 일부 SVG |
| 폰트 로딩 | Netmarble 공유 폰트 CDN (`sgimage.netmarble.com/font/v2/font.css`) + Google Fonts (Inter, Noto Sans) |
| CSS 아키텍처 | CSS 커스텀 프로퍼티 거의 없음 (Swiper 기본값 2개만 루트에 노출). 스타일은 대부분 Vue SFC scoped. |
| 트래킹 | Clarity, TikTok Pixel, LINE Tag, SmartNews, Kakao, Naver WCS, Twitter UWT (총 7+ 픽셀) |

**핵심 관찰**: 우리가 Astro SSR + React 아일랜드로 같은 효과를 내려면:
- Swiper.js 또는 embla-carousel (더 경량) 로 슬라이더
- framer-motion·motion-primitives 또는 `IntersectionObserver + CSS @starting-style`
- 비디오 배경은 포기하거나 극히 제한적 사용 (모바일 배터리·데이터 소비, SEO 가독성)

---

## 2. 색상 팔레트 (계측값)

| 토큰 | RGB | OKLCH 근사 | 용도 |
|---|---|---|---|
| body bg | `rgb(9, 15, 31)` | `oklch(0.15 0.043 268)` | 전역 배경, 미드나잇 네이비 |
| world section bg | `rgb(24, 11, 45)` | `oklch(0.17 0.10 300)` | 섹션 배경 (딥 퍼플), 톤 시프트 |
| 헤드라인 그라디언트 start | `rgb(248, 196, 255)` | `oklch(0.86 0.085 335)` | 피치 핑크 |
| 헤드라인 그라디언트 end | `rgb(217, 213, 255)` | `oklch(0.87 0.055 290)` | 페리윙클 라벤더 |
| nav 텍스트 | `rgb(255, 255, 255)` (w:700 30px) | `oklch(1 0 0)` | 순백 (우리는 회피 — 금지) |
| 부가 텍스트 1 | `rgb(234, 236, 255)` | `oklch(0.94 0.020 280)` | 매우 옅은 라벤더 화이트 |
| 딥 퍼플-네이비 | `rgb(28, 26, 65)` | `oklch(0.24 0.075 285)` | 카드 하이라이트 |
| 주 CTA "게임 시작" | 스크린샷 상 보라-핑크 필 (linear-gradient) | ~`oklch(0.70 0.16 315)` | 메인 CTA (우리는 solid로) |

**팬사이트 적용**:
- 배경·표면·보더는 공식과 톤 맞춤 (미드나잇 네이비 268° hue)
- 악센트는 공식의 피치 핑크 `oklch(0.86 0.085 335)` **solid**로 사용 (공식처럼 gradient text 금지 — AI slop 지문)
- 세컨더리 악센트로 딥 퍼플 섹션 전환 `oklch(0.24 0.075 285)` 가끔 사용 (카드 hover, 인용 블록)
- 순백 절대 금지 → `oklch(0.97 0.008 280)` 따뜻한 화이트
- 네온 청록 on 검정 AI slop 패턴 회피

---

## 3. 타이포그래피 (폰트 시스템 해부)

공식 사이트는 Netmarble 공유 폰트 CDN을 통해 **총 19종 한글 폰트 + Inter + Noto Sans** 를 lazy 로드. 실제 body font-family 체인:

```
HGGGothicssi, SUIT, "Noto Sans", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif
```

네트워크 관찰상 등록된 폰트 중 **실제 활성 사용은 HGGGothicssi(w:400/700/900)** 이며, SUIT·Noto Sans는 폴백.

### 헤드라인 패턴
- h2: `font-size: 60px` (hero) / `40px` (섹션), `font-weight: 700`, **gradient text** (피치→라벤더).
- nav: `30px` w:700
- 모든 본문·메타: 16px w:400

### 팬사이트 적용
- **HGGGothicssi는 유료** — 폴백 체인의 SUIT Variable을 primary로 사용 (공식 가족성 유지).
- Display/Body 모두 SUIT 단일 family로 통일, 웨이트 대비(400 ↔ 800)로 리듬.
- **Gradient text 금지** (AI slop 지문). 헤드라인은 solid 피치 핑크 또는 화이트 solid.
- 쿠폰 코드용 시그니처 모노: **Departure Mono** (star dive 메타포 공명, 레트로 우주 터미널).

---

## 4. 레이아웃 구조

### 4.1 섹션 순서 (Swiper 수직 슬라이드)
1. **main** — 미나 캐릭터 히어로 + 다운로드 QR + 스토어 뱃지
2. **bg-movie fixed** — 고정 배경 비디오 레이어
3. **character** — 캐릭터 선택 탭 (엘렌도르/바레인/세레니아/수라/남령 지역별) + 캐릭터 롤플레이(미나/베르나/클라우드/오필리아/프란시스) + CV + 2D/3D 뷰 토글
4. **bg-movie** — 비디오 트랜지션
5. **bg-movie effect-video blend-screen-overlay** — 비디오+블렌드 모드
6. **world** (`bg: rgb(24,11,45)` 딥 퍼플) — 몬스터 길들이기 / 공허와 창조 / 세계, 벨라나 / 몬스터 / 몬스터링
7. **pv intersect** — 스크롤 트리거 PV 섹션
8. **footer**

### 4.2 HUD (모든 슬라이드 공통 오버레이)
- 좌상: Netmarble 로고 / STAR DIVE 로고 / 확률안내 배지
- 우상: 공유·SNS 토글·북마크·"게임 시작" CTA(보라-핑크 필)·메뉴
- 우측: 수직 네비게이션 (메인·캐릭터·세계관·PV·드롭스·미디어·크리에이터·웹상점) — 스와이프 슬라이드와 연동
- 우하: BGM ON/OFF
- 하단 중앙: 슬라이드 인디케이터 + "Next slide"

### 4.3 팬사이트 적용 — 절대 따라하지 말 것
- ❌ 수직 Swiper 풀페이지 캐러셀 — SEO 최악, 검색 유입에 부적합
- ❌ 자동재생 배경 비디오 — 모바일 데이터·배터리
- ❌ 무거운 HUD — 정보 소비를 방해

### 4.4 팬사이트 적용 — 참고할 것
- 섹션 배경 톤 시프트 (`world` 섹션이 배경을 쪽빛→딥 퍼플로 넘어가는 디자인)
- IntersectionObserver 기반 진입 reveal (미세)
- 캐릭터 탭/토글 UX 구조 (지역 → 캐릭터 → 2D/3D)

---

## 5. 모션·연출

| 요소 | 공식 구현 | 팬사이트 방침 |
|---|---|---|
| 전체 느낌 | Vertical swiper + background video + 캐릭터 진입 페이드 | **페이지 기반 스크롤** (Swiper 없이), 모션 최소 |
| 배경 비디오 | `autoplay loop muted` + `mix-blend-mode: screen/overlay` | **없음** (SEO·성능·배터리) |
| 섹션 진입 | `.intersect` 클래스 + scroll-trigger | IntersectionObserver로 페이드인 (일부 섹션만, stagger 금지) |
| 헤드라인 gradient | gradient text (background-clip: text) | **금지**, solid 피치핑크 |
| CTA 버튼 | 보라-핑크 gradient fill pill | solid 피치 핑크 background + hover border |
| 시그니처 | (공식엔 없음) | **쿠폰 복사 모션** — tap → translateY(-4px) + ring pulse + 햅틱 |

---

## 6. 캐릭터·세계관 구조 (팬사이트 스키마 매핑)

공식 /캐릭터 섹션에서 추출한 **지역 분류 + 캐릭터 + CV + 2D/3D 토글** 구조는 팬사이트 도메인 모델에 직접 반영됨:

```
Region(엘렌도르/바레인/세레니아/수라/남령)
  ↓ 1:N
Character(미나/베르나/클라우드/오필리아/프란시스/...)
  ├─ CV 한국어 (윤은서)
  ├─ CV 일본어 (鬼頭明里)  → `voice_actors jsonb` 또는 정규화 테이블
  ├─ 설명문 (타고난 능력·종족·스토리 역할)
  ├─ 링크: 인터뷰·X 포스트 (source_urls)
  ├─ 2D 일러스트 URL
  └─ 3D 모델 URL (우리는 2D만 우선, 3D는 Phase 1 후기에)
```

공식 사이트가 SPA라 **WebFetch로는 이 데이터 못 긁음 → Playwright 필수**. (이미 §5.3 크롤러 스펙에 반영됨)

세계관 섹션의 스토리 구조:
- **세계명**: 벨라나
- **대륙 3개**: 중앙(솔리메나 왕국), 극동(백아), 죽음의 땅
- **종교 개념**: 큰 고양님(창조신), 공허
- **몬스터 = "마석" 보유 생물**, **몬스터링 = 몬스터의 핵(마석)** — 이게 게임 타이틀의 "길들이기" 시스템
- **사역 후 Link 상태** — 뜨거운 물 부으면 원래 모습 복귀 (로어 디테일)

`LoreEntry` 스키마에 `region/race/faction/character_npc/event/glossary/timeline` kind enum 이미 들어가 있음 — 커버됨.

---

## 7. 긍정 참고 (팬사이트에 끌어올 것)

1. **색 톤 가족** — 미드나잇 네이비 + 피치-라벤더 스타더스트 악센트. 공식과 즉시 연결되는 브랜드 연속성.
2. **섹션별 배경 틴트 변화** (`world` 섹션 딥 퍼플) — 긴 스크롤에서 단조로움 깨기.
3. **캐릭터 상세 모듈 구조** — CV 한/일 병기, 2D/3D 뷰, 인터뷰 링크.
4. **어휘·용어의 정교함** — "마석", "몬스터링", "사역", "링크 상태", "벨라나" 등. 팬사이트 용어집(glossary)에 그대로 사용.

## 8. 부정 참고 (절대 따라하지 말 것)

1. ❌ Vertical full-page swiper — SEO 죽음
2. ❌ 자동재생 배경 비디오 — 성능·모바일 UX
3. ❌ Gradient text 헤드라인 — AI slop 탐지 지문
4. ❌ HGGGothicssi 강제 (유료) — 우리는 SUIT로 대체
5. ❌ 순백 텍스트 (`#FFFFFF`) — 네이비 틴트 적용한 softer white
6. ❌ 수십 종 폰트 lazy 로드 — 우리는 2종 (SUIT + Departure Mono)

---

## 9. 체크리스트 (팬사이트 UI 검증 시)

- [ ] body bg가 `oklch(0.14 0.045 268)` 범위인가 (미드나잇 네이비, 공식 톤 가족)
- [ ] 악센트가 피치 핑크 `oklch(0.86 0.085 335)` 이고 10% 이하 빈도인가
- [ ] 헤드라인에 gradient-text 금지 준수했는가
- [ ] 순백·순흑 금지, 전부 네이비 틴트 적용
- [ ] 쿠폰 카드 80pt Departure Mono 코드가 시그니처로 자리잡았는가
- [ ] 모션은 최소 + 쿠폰 복사 ring pulse만 두드러지는가
- [ ] 섹션 톤 시프트 (`/tier` 또는 `/lore`는 딥 퍼플 hint) 활용되었는가
- [ ] `prefers-reduced-motion` 존중, 시그니처까지 정지
- [ ] SEO·성능: 비디오 배경 없음, LCP 2.5s 이내
