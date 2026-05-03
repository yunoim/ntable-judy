# judy.ntable.kr

비공개 데이트 다이어리 — 카카오 OAuth + 관리자 승인 시스템.

## Stack
- Next.js 14 App Router
- Prisma + PostgreSQL
- Kakao OAuth 2.0
- Anthropic Claude API
- Tailwind CSS v3

## Setup
1. `pnpm install`
2. `cp .env.example .env.local` → 값 채우기
3. `pnpm prisma migrate dev`
4. `pnpm dev`

## 배포
Railway + Cloudflare. 자세한 건 비공개 운영 문서 참조.
