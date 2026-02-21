# Session Handoff

## Latest Update (2026-02-21)

- Done:
  - pnpm 워크스페이스 + Next.js 16(App Router) 앱(`apps/web`) 부트스트랩 완료
  - PostgreSQL 대상 Prisma schema/migration/seed 파일 작성 완료
  - JWT+HttpOnly 쿠키 인증 API(`POST /api/v1/auth/login`, `POST /api/v1/auth/logout`) 구현 완료
  - 학생 기본 API(`GET/POST /api/v1/students`)와 소유권 가드 스캐폴딩 구현 완료
  - 로그인/대시보드 기본 UI 및 보호 라우팅(Proxy) 구현 완료
  - M2 입력 API 구현 완료
    - `GET /api/v1/curriculum`
    - `POST /api/v1/materials`
    - `POST /api/v1/attempts`
    - `POST /api/v1/attempts/{attemptId}/items`
    - `POST /api/v1/wrong-answers`
    - `GET /api/v1/wrong-answers`
    - `PUT /api/v1/wrong-answers/{id}/categories`
    - `POST /api/v1/wrong-answers/{id}/image`
  - M2 최소 UI 2화면(`records/new`, `wrong-answers/manage`) 및 보호 라우팅 연결 완료
  - 오답 이미지 로컬 저장 정책(`public/uploads/wrong-answers`, 5MB, jpeg/png/webp) 적용 완료
  - 품질 게이트 통과: lint, typecheck, unit, integration, e2e smoke
  - Docker DB 런타임 검증 완료: `docker compose -f infra/docker/docker-compose.local.yml up -d`, `pnpm -C apps/web exec prisma migrate deploy`, `pnpm -C apps/web prisma:seed`
  - Prisma config `.env` 로딩을 Node 내장 `process.loadEnvFile` 기반으로 정리
  - 클로즈아웃 리뷰 결과 반영: Prisma deprecated seed 설정 제거 및 Playwright 산출물 ignore 적용
- In Progress:
  - M3 대시보드 API/시각화 설계 확정
- Blocked:
  - 현재 확인된 블로커 없음
- Next:
  - M3 API(`overview/weakness/trends`) 계약과 계산 규칙을 문서/코드로 고정
  - 대시보드 핵심 위젯(진도/약점/오답유형) UI를 실제 데이터와 연결
  - 로컬 업로드 파일 백업/정리 정책 운영 체크리스트 추가
  - 진행 중 결정사항은 `PROJECT_STATUS.md`와 `DECISION_LOG.md`에 즉시 동기화

## Session Start Checklist

1. `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md` 확인
2. `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` 최신 결정 확인
3. 현재 작업 범위가 PRD와 일치하는지 점검
