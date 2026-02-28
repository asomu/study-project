# Session Handoff

## Latest Update (2026-02-28)

- Done:
  - pnpm 워크스페이스 + Next.js 16(App Router) 앱(`apps/web`) 부트스트랩 완료
  - PostgreSQL 대상 Prisma schema/migration/seed 파일 작성 완료
  - JWT+HttpOnly 쿠키 인증 API(`POST /api/v1/auth/login`, `POST /api/v1/auth/logout`) 구현 완료
  - 학생 기본 API(`GET/POST /api/v1/students`)와 소유권 가드 스캐폴딩 구현 완료
  - M2 입력 API 8종 + 최소 UI 2화면(`records/new`, `wrong-answers/manage`) + 로컬 업로드 정책 구현 완료
  - M3 대시보드 API 구현 완료
    - `GET /api/v1/dashboard/overview`
    - `GET /api/v1/dashboard/weakness`
    - `GET /api/v1/dashboard/trends`
  - M3 계산 모듈 분리 완료
    - `modules/analytics/dashboard-metrics.ts`
    - `modules/analytics/dashboard-schemas.ts`
    - `modules/dashboard/date-range.ts`
    - `modules/dashboard/serializers.ts`
  - `/dashboard` 단일 화면 MVP 개편 완료
    - 필터(학생/기준일/기간), KPI 카드, 약점/유형 분포, 주간 추이(SVG 차트), 빈상태 CTA
  - 품질 게이트 통과: `lint`, `typecheck`, `test(unit+integration)`, `test:e2e`
  - 문서 동기화 완료: `API_SPEC_V1`, `DEVELOPMENT_PLAN`, `PROJECT_STATUS`, `DECISION_LOG`, `HANDOFF`
  - 세션 부트스트랩 요약 허브 추가: `/Users/mark/Documents/project/study-project/docs/CONTEXT_INDEX.md`
  - `AGENTS.md`, `docs/INDEX.md`, `HANDOFF.md` 시작 체크리스트를 `CONTEXT_INDEX` 우선 순서로 정렬
  - M3 기술 설명 학습 노트 저장 및 인덱스 반영
    - `/Users/mark/Documents/project/study-project/docs/07-learning/notes/2026-02-24-m3-dashboard-mvp-tech-explainer.md`
    - `/Users/mark/Documents/project/study-project/docs/07-learning/TECH_EXPLAINER_INDEX.md`
  - M4 회귀 강화 Wave 1 완료
    - 테스트 fixture 추가: `/Users/mark/Documents/project/study-project/apps/web/tests/fixtures/dashboard-fixtures.ts`
    - Unit 확장: 대시보드 계산 함수 경계 케이스 추가
    - Integration 확장: dashboard `weakness/trends` `401/403/400` 실패 경로 및 월간/주간 날짜 경계 검증
    - 품질 게이트 재통과: `lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e`, `check-doc-links.sh`
  - M4 회귀 강화 Wave 2 완료
    - Fixture 확장: `overview/trends` 계산 경계(기본 날짜, 2학기 시작, 빈 커리큘럼, 부분 주간 버킷, rangeEnd-only)
    - Unit 확장: `calculateRecommendedPct` 2학기 시작값/종료 이후 clamp 검증
    - Integration 확장: `overview/trends` 경계 계산 시나리오 및 쿼리 날짜 경계 검증
    - 품질 게이트 재통과: `lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e`, `check-doc-links.sh`
  - M4 회귀 강화 Wave 3 완료
    - e2e fixture 모듈 추가: `tests/e2e/fixtures/dashboard-wave3-fixtures.ts`
    - `records -> wrong-answers -> dashboard` 흐름에서 overview/weakness/trends 데이터 반영 회귀 고정
    - 대시보드 필터(기준일/약점기간) 변경 시 API 쿼리 파라미터 반영 검증
    - 품질 게이트 재통과: `lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e`, `check-doc-links.sh`
  - M2 UX 백로그 처리 완료
    - 오답 카테고리 입력 UI를 선택형(checkbox)으로 전환하고 직접 키 입력 제거
    - unit/integration/e2e 테스트를 선택형 UI 흐름 기준으로 보강
  - lint 게이트 안정화 완료
    - `test-results` 미존재 환경에서도 `pnpm lint`가 실패하지 않도록 스크립트 보강
  - 운영 체크리스트 문서 신설 완료
    - `/Users/mark/Documents/project/study-project/docs/05-operations/OPERATIONS_CHECKLIST.md`
    - 로컬 업로드 백업/보관/정리 주기 및 알림 기준 확정
  - M4 마무리 완료
    - PR/릴리즈 회귀 게이트를 문서 기준으로 고정
    - `PROJECT_STATUS`를 M4 `COMPLETED`로 전환
- In Progress:
  - 없음
- Blocked:
  - 현재 확인된 블로커 없음
- Next:
  - M3 지표 해석 가이드(부모/학생용 설명 문구)를 UX 텍스트로 구체화
  - 외부 공개 대비 TLS/접근제어 사전 리허설 1회 수행
  - M5 후보(리포트/추천 메시지) 우선순위를 PRD/개발 계획에 반영

## Session Start Checklist

1. `/Users/mark/Documents/project/study-project/docs/CONTEXT_INDEX.md` 요약 확인
2. `/Users/mark/Documents/project/study-project/docs/INDEX.md` 네비게이션 확인
3. `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md` 확인
4. `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` 최신 결정 확인
5. 현재 작업 범위가 PRD와 일치하는지 점검
