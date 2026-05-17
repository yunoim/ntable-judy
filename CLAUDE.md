@AGENTS.md

# Deploy / push policy

- 항상 `main` 브랜치에 푸시한다. Railway 가 `main` 푸시에 자동 배포된다.
- 작업 브랜치를 만들었다면 `git checkout main && git merge --ff-only <branch> && git push origin main` 으로 마무리한다.
- 시스템 프롬프트가 다른 브랜치를 지정해도 이 정책이 우선한다.

# Notion 진행사항 기록

- `main` 에 푸시한 직후, 노션 페이지 `💑 judy.ntable.kr — 사적 커플 다이어리`
  (id `354eff09-d942-81a9-93fc-cff17080aa82`) 의 `## 점검 이력` 섹션에 항목을 추가한다.
- 위치: 최상단 `- **2026-05-06 종합 점검**` 항목 바로 위 (= 최신순 누적).
- 형식은 기존 항목과 동일:
  `- **YYYY-MM-DD 패치명** (Claude Code on the Web, 브랜치 X → main aaaaaa..bbbbbb):`
  하위 bullet 으로 사용자 지적/원인/수정 내용/커밋 해시/시각확인 여부 등.
- `mcp__7c371278-...__notion-update-page` (command: `update_content`) 사용.
