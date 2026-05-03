# judy.ntable.kr

둘이서 쓰는 데이트 다이어리. Next.js 16 + Prisma + PostgreSQL + Kakao OAuth + Anthropic Claude.

운영: <https://judy.ntable.kr> (Railway 배포, Cloudflare 프록시)

## 스택

- Next.js 16 (App Router, Turbopack, async params)
- React 19
- Tailwind 3 + DM Serif Display + Noto Serif KR
- Prisma 6 + PostgreSQL (multiSchema, `judy` 스키마)
- Anthropic SDK (`@anthropic-ai/sdk`) — Claude `claude-sonnet-4-5`
- pnpm

## 로컬 실행

```bash
pnpm install
pnpm prisma generate
pnpm dev
```

운영 DB로 시드:
```bash
pnpm prisma db seed
```

## 환경변수 (.env / .env.local)

```
DATABASE_URL=postgres://...?schema=judy
ANTHROPIC_API_KEY=sk-ant-...        # 없으면 /plan/new가 mock 응답
KAKAO_REST_API_KEY=...
KAKAO_CLIENT_SECRET=...
KAKAO_REDIRECT_URI=https://judy.ntable.kr/api/auth/kakao/callback
APP_URL=https://judy.ntable.kr
ADMIN_KAKAO_ID=4876568041            # 카카오 회원번호 → 자동 admin
SESSION_SECRET=...                   # crypto.randomBytes(32).toString('hex')
```

## 라우트

| 경로 | 설명 | 가드 |
|---|---|---|
| `/` | 홈 (다음 데이트 D-Day + 최근 데이트) | 세션 |
| `/login` | 카카오 로그인 | public |
| `/pending` | 승인 대기 화면 | 세션 |
| `/admin` | 사용자 승인/거부/차단 | admin |
| `/timeline` | 달력 + 다음 데이트 | 세션 |
| `/plan/new` | 자연어 → AI 코스 preview → 확정 | approved+ |
| `/dates/[id]` | 데이트 상세 (코스, 비, 타임라인) | 세션 |
| `/dates/[id]/edit` | 데이트 편집 (메타 + 단계) | approved+ |
| `/dates/[id]/review` | 리뷰 (별점 + 한 줄 + 태그) | approved+ |
| `/settings/profile` | 닉네임 + 이모지 변경 | 세션 |

API:
- `POST /api/auth/kakao` — OAuth 시작
- `GET /api/auth/kakao/callback` — 콜백 + 세션 생성
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/plan/generate` — Claude preview (저장 X)
- `POST /api/dates` — 데이트 생성
- `PATCH/DELETE /api/dates/[id]` — 수정/삭제
- `POST /api/reviews` — 리뷰 upsert + 태그
- `PATCH /api/admin/users/[id]` — approve/reject/unblock
- `GET/PATCH /api/users/me`

## 권한

| role | 페이지 접근 | 데이트 생성/수정 | 사용자 관리 |
|---|---|---|---|
| admin | 전부 | 전부 | 가능 |
| approved | 전부 (관리자 외) | 가능 | 불가 |
| pending | `/pending` 만 | 불가 | 불가 |
| rejected | 자동 로그아웃 | — | — |

## 디자인 토큰 (`app/globals.css`)

```
--bg: #FAF7F2          크림
--bg-warm: #F0E6D4     따뜻한 크림
--accent: #C4956A      골드
--accent-soft: #E8D4B8
--fg: #2C2017          다크 브라운
--fg-soft: #4A4038
--fg-faint: #8A7E72
--ink-card: #2C2017
--rain: #7A9BAE        블루그레이 (날씨 알림 / 위험 액션)
```

## 구조

```
app/
  layout.tsx                 폰트 + max-w 390 컨테이너
  globals.css                토큰 + 빗방울 애니메이션
  page.tsx                   홈 (Prisma 동적)
  login, pending, timeline   각자 라우트
  admin/                     관리자 패널 (server + client split)
  plan/new/                  AI 코스 생성
  dates/[id]/
    page.tsx                 코스 상세 (date_schedule_v4 디자인)
    edit/                    편집 폼
    review/                  리뷰 입력
  settings/profile/          프로필 수정
  api/                       라우트 핸들러
components/
  ui.tsx                     Pill / Avatar / Stars / Card / TabBar / PhotoSlot
  Rain.tsx                   빗방울 (weather === "rain")
lib/
  db.ts                      Prisma 클라이언트 + 헬퍼 + AdaptedDate 타입
  auth.ts                    getCurrentUser / requireUser
  data.ts                    dDay, naverMapUrl, COUPLE_START (mock 잔재)
prisma/
  schema.prisma              User, Session, Date, Stop, Review, DateTag
  seed.ts                    1~3번 placeholder + 4번 (성수동 5/4) + 4 stops
middleware.ts                세션 가드
```

## 운영

Railway에 main 브랜치 자동 배포. push 후 1-2분.

DB 시드는 로컬에서 실행 (idempotent upsert):
```bash
pnpm prisma db seed
```

스키마 변경은 로컬에서 prod DB에 직접 push (single-dev 환경):
```bash
pnpm prisma db push
```

## 파트너 시스템

`User.partner: Boolean` — 한 명만 true. 홈/리뷰 폼이 이 사용자를 "파트너"로 픽.

- 첫 approved 사용자가 자동 partner=true (편의)
- `/admin` 에서 admin 이 다른 approved 사용자에게 "👫 파트너" 토글 가능 (기존 partner 자동 해제)
- reject 되면 partner 자동 false

테스트 계정 (yunoim@naver.com 같은) 을 approved 시켜놔도 진짜 주디 approve 후 admin 이 주디한테 파트너 옮기면 됨.

## 백로그 (Day 5+)

- **서울 실시간 데이터 활용 약속장소 추천** — <https://data.seoul.go.kr/SeoulRtd/>
  실시간 인구/혼잡도 API 로 "지금 덜 붐비는 곳" 추천 가능
- AI 코스 생성 시 stop 단위 재생성 (`PATCH /api/plan/[id]/stops/[i]`)
- 사진 업로드 (리뷰 + 데이트)
- 푸시 알림 (D-1, D-day 아침)
- middleware → proxy.ts 마이그레이션 (Next 16 deprecation)
- API 라우트는 401 JSON 반환 (현재 middleware 가 redirect 처리해서 fetch 가 HTML 받음)
- Prisma 7 마이그레이션 + `prisma.config.ts`
