# judy.ntable.kr — Next.js 14 App Router scaffold

선택된 와이어프레임 변형 (01B / 03A / 04A / 05A / 06B) 기준으로 짠 .tsx 스캐폴드입니다.

## 설치 / 실행

```bash
pnpm create next-app@latest judy --typescript --tailwind --app --src-dir=false --import-alias="@/*"
# 위에서 생성된 폴더에 이 tsx/ 의 파일들을 그대로 덮어쓰기
cp -r tsx/* judy/
cd judy
pnpm add @anthropic-ai/sdk
pnpm dev
```

## 환경변수 (.env.local)

```
ANTHROPIC_API_KEY=sk-ant-...
JUDY_LOGIN_KEY=judy_xxxxxxxxxxxxx
ME_LOGIN_KEY=me_xxxxxxxxxxxxx
```

## 첫 로그인

```
http://localhost:3000/login?key=me_xxxxxxxxxxxxx
```
또는 입력란에 직접 키 붙여넣기.

## 폴더 구조

```
app/
  layout.tsx                 폰트, 메타, 모바일 max-w 390 컨테이너
  globals.css                CSS 변수 + tailwind
  login/page.tsx             01 B 풀블리드 + 키 입력
  page.tsx                   03 A 홈 대시보드
  plan/new/page.tsx          04 A 자유 텍스트 + 로딩
  plan/[id]/page.tsx         AI 결과 타임라인
  dates/[id]/review/page.tsx 05 A 바텀시트 리뷰
  timeline/page.tsx          06 B 달력 + 다음 데이트
  api/
    auth/login/route.ts
    plan/generate/route.ts   ← Anthropic Claude 호출
    reviews/route.ts
components/ui.tsx            Pill / Avatar / Stars / Card / TabBar / PhotoSlot
lib/
  data.ts                    타입 + MOCK 데이터 (Prisma로 교체)
  cn.ts
middleware.ts                인증 가드
tailwind.config.ts
```

## 다음 단계

- [ ] `MOCK_DATES` → Prisma + SQLite 로 교체 (`prisma/schema.prisma`)
- [ ] `app/dates/[id]/page.tsx` 데이트 상세 (계획 vs 실제, 둘의 별점)
- [ ] `lib/auth.ts` 로 `await getCurrentUser()` 헬퍼 추출 (현재는 cookies() 직접)
- [ ] AI 결과 화면에서 stop 단위 재생성 (`PATCH /api/plan/[id]/stops/[i]`)
- [ ] 사진 업로드 (v2)
- [ ] 푸시 알림 (v2)
