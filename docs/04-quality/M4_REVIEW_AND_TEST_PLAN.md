# M4 Review and Verification Test Plan

- Version: v1.0
- Last Updated: 2026-03-01
- Baseline: 2026-02-28 (`M4 Completed / Release Gate Locked`)
- Scope: `/Users/mark/Documents/project/study-project/apps/web`

## 1. 목표

- 운영 방식은 2단계로 고정한다.
  - PR 단계: 스모크 게이트
  - 릴리즈 단계: 풀회귀 게이트
- PRD FR-001~FR-009 범위에서 기능 회귀, 권한/소유권 리스크, 운영 점검 누락을 조기에 차단한다.

## 2. 범위와 성공 기준

검증 기준 문서:
- `/Users/mark/Documents/project/study-project/docs/04-quality/TEST_AND_VALIDATION.md`
- `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md`
- `/Users/mark/Documents/project/study-project/docs/05-operations/OPERATIONS_CHECKLIST.md`
- `/Users/mark/Documents/project/study-project/docs/03-process/ENGINEERING_PROCESS.md`

성공 기준:
- PR 단계: 스모크 게이트 100% 통과
- 릴리즈 단계: 풀회귀 게이트 100% 통과
- 하나라도 실패하면 `No-Go`로 판정하고 수정 후 전체 게이트를 재실행한다.

## 3. 검토 방법 (Review Method)

1. 변경 영향도 식별
- 변경 파일을 `domain`, `api`, `ui`, `ops-doc`로 분류한다.
- 변경 항목을 PRD FR ID와 매핑한다.

2. 결함 검토 축 (severity-first)
- P0: 인증 우회/소유권 위반/데이터 손실
- P1: 핵심 사용자 흐름 실패(로그인 -> 입력 -> 대시보드)
- P2: 계산/검증 경계 오동작, 회귀 누락
- P3: 가독성/유지보수 개선 항목

3. 필수 검토 체크
- behavioral regression risk
- access control and privacy risk
- API 계약 및 에러 코드 일관성
- 테스트 공백(신규/변경 로직 대비)

4. 리뷰 산출물
- Findings(심각도순) + 근거 파일
- Risks(잔여 리스크)
- Release recommendation(`Go` / `No-Go`)

## 4. 실행 플로우 (2단계 고정)

### 4.1 PR 스모크 게이트

실행 명령:
- `pnpm verify:pr`
- 또는 `bash scripts/run-verification-gates.sh --mode pr`

기본 실행 세트:
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `bash scripts/check-doc-links.sh`

추가 E2E 규칙(변경 경로 기반):
- `apps/web/src/app/api/v1/**` 또는 `apps/web/src/app/(protected)/**` 변경 시:
  - `tests/e2e/records-wrong-answers.spec.ts`
- 대시보드 UI/집계 경로 변경 시:
  - `tests/e2e/dashboard-m3.spec.ts`

### 4.2 릴리즈 풀회귀 게이트

실행 명령:
- `pnpm verify:release`
- 또는 `bash scripts/run-verification-gates.sh --mode release`

필수 실행 세트:
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm test:e2e`
5. `bash scripts/check-doc-links.sh`

운영 체크 세트:
1. `test -d apps/web/public/uploads/wrong-answers`
2. `test -d backups/wrong-answers`
3. `du -sk apps/web/public/uploads/wrong-answers`
4. 업로드 디렉터리 용량 2GB 초과 시 `조건부 보류(HOLD)` 판정 후 원인 분석

## 5. FR 매핑 기반 동작 검증 시나리오

1. FR-001 학생/권한
- `tests/integration/students-route.test.ts`
- `tests/e2e/login-dashboard.spec.ts`
- 기대결과: 타 보호자 데이터 접근 403, 로그인/보호 라우팅 정상

2. FR-002 커리큘럼 조회
- `tests/integration/curriculum-route.test.ts`
- 기대결과: `asOfDate` 검증, 버전 선택 규칙 일관성

3. FR-003 문제집 등록
- `tests/integration/materials-route.test.ts`
- 기대결과: 소유권 체인/subject 제약 검증 통과

4. FR-004 시도/문항 입력
- `tests/integration/attempts-route.test.ts`
- `tests/integration/attempt-items-route.test.ts`
- 기대결과: 문항 중복/유효성/소유권 검증 정상

5. FR-005 오답 이미지
- `tests/integration/wrong-answer-image-route.test.ts`
- `tests/e2e/records-wrong-answers.spec.ts`
- 기대결과: MIME/용량/업로드 경로 정책 준수

6. FR-006 카테고리 저장(복수 선택)
- `tests/unit/category-selection.test.ts`
- `tests/integration/wrong-answer-categories-route.test.ts`
- `tests/e2e/records-wrong-answers.spec.ts`
- 기대결과: 다중 선택 저장, 빈 배열 해제, 조회 반영 일치

7. FR-007/008/009 대시보드/리포트/약점 우선순위
- `tests/unit/dashboard-metrics.test.ts`
- `tests/integration/dashboard-routes.test.ts`
- `tests/e2e/dashboard-m3.spec.ts`
- `tests/e2e/records-wrong-answers.spec.ts`
- 기대결과: overview/weakness/trends 경계, 기간/필터/쿼리 파라미터 반영, 회귀 없음

## 6. Public API 검증 대상 목록

- `/api/v1/auth/login`, `/api/v1/auth/logout`
- `/api/v1/students`
- `/api/v1/curriculum`
- `/api/v1/materials`
- `/api/v1/attempts`, `/api/v1/attempts/{attemptId}/items`
- `/api/v1/wrong-answers`, `/api/v1/wrong-answers/{id}/categories`, `/api/v1/wrong-answers/{id}/image`
- `/api/v1/dashboard/overview`, `/api/v1/dashboard/weakness`, `/api/v1/dashboard/trends`

정책:
- 본 플랜 자체는 API/타입 변경을 포함하지 않는다.

## 7. 실행 후 결과 보고 템플릿

1. Gate Summary
- PR 스모크: pass/fail
- 릴리즈 풀회귀: pass/fail
- 운영 체크: pass/fail

2. Findings
- P0~P3 심각도순, 파일/시나리오 근거 포함

3. Residual Risks
- 즉시 수정 대상 vs 차기 백로그 분리

4. Release Decision
- `Go` 또는 `No-Go` 단일 결론

## 8. 가정 및 기본값

1. 기준 브랜치는 `main`으로 둔다.
2. 검증은 로컬 환경 기준으로 수행한다.
3. DB 스키마/마이그레이션 변경은 본 플랜 범위에서 제외한다.
4. 문서 변경이 포함되면 `check-doc-links.sh`를 항상 실행한다.
5. 릴리즈 판정 예외는 두지 않고 필수 게이트 전부 통과 시에만 `Go`로 판단한다.
