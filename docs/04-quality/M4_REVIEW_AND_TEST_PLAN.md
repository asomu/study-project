# M4 Review and Verification Test Plan

- Version: v1.3
- Last Updated: 2026-03-23
- Baseline: 2026-03-22 (`M10 Completed / WrongNote + Workbook beta`)
- Scope: `/Users/mark/Documents/project/study-project/apps/web`
- Note: 파일명은 `M4_*`를 유지하지만, 현재 private beta 회귀 게이트 기준 문서로 계속 사용한다.

## 1. 목표

- 운영 방식은 2단계로 고정한다.
  - PR 단계: 스모크 게이트
  - 릴리즈 단계: 풀회귀 게이트
- PRD FR-001~FR-013 범위에서 회귀, 권한/소유권 리스크, 스토리지 운영 누락을 조기에 차단한다.

## 2. 범위와 성공 기준

검증 기준 문서:

- `/Users/mark/Documents/project/study-project/docs/04-quality/TEST_AND_VALIDATION.md`
- `/Users/mark/Documents/project/study-project/docs/04-quality/USER_E2E_MANUAL_CHECKLIST.md`
- `/Users/mark/Documents/project/study-project/docs/05-operations/USER_GUIDE.md`
- `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md`
- `/Users/mark/Documents/project/study-project/docs/05-operations/OPERATIONS_CHECKLIST.md`

성공 기준:

- PR 단계: 스모크 게이트 100% 통과
- 릴리즈 단계: 풀회귀 게이트 100% 통과
- 하나라도 실패하면 `No-Go`로 판정하고 수정 후 전체 게이트를 재실행한다.

## 3. 검토 방법 (Review Method)

1. 변경 영향도 식별
- 변경 파일을 `wrong-note`, `workbook`, `auth-family`, `ops-doc`로 분류한다.
- 변경 항목을 PRD FR ID와 매핑한다.

2. 결함 검토 축 (severity-first)
- P0: 인증 우회/소유권 위반/데이터 손실
- P1: 핵심 사용자 흐름 실패(학생 업로드, 보호자 피드백, workbook progress)
- P2: 계산/검증 경계 오동작, 회귀 누락
- P3: 가독성/유지보수/문서 품질 개선 항목

3. 필수 검토 체크
- behavioral regression risk
- access control and privacy risk
- API 계약 및 에러 코드 일관성
- 테스트 공백(신규/변경 로직 대비)
- 문서와 실제 게이트 스크립트의 일치 여부

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
3. `pnpm build`
4. `pnpm test`
5. `bash scripts/check-doc-links.sh`

`pnpm test` 구성:

- `test:unit`
- `test:route-contract`
- `test:integration:real`

추가 E2E 규칙(현재 스크립트 기준):

- 아래 경로 변경 시 `tests/e2e/wrong-note-dashboard.spec.ts` 추가 실행
  - `apps/web/src/app/api/v1/(student/)?wrong-notes*`
  - `apps/web/src/components/wrong-notes/*`
  - `apps/web/src/modules/wrong-note/*`
  - `apps/web/src/app/(protected)/dashboard/*`
  - `apps/web/src/app/(protected)/student/dashboard/*`
- workbook UI가 `wrong-note-workspace.tsx` 안에 있으므로 현재 student/guardian 대시보드 변경은 같은 mocked E2E로 묶여 검증된다.

### 4.2 릴리즈 풀회귀 게이트

실행 명령:

- `pnpm verify:release`
- 또는 `bash scripts/run-verification-gates.sh --mode release`

필수 실행 세트:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm build`
4. `pnpm test`
5. `pnpm test:e2e`
6. `pnpm -C apps/web run wrong-note:storage:audit -- --json`
7. `bash scripts/check-doc-links.sh`

`pnpm test:e2e` 구성:

- mocked UI regression 1종: `tests/e2e/wrong-note-dashboard.spec.ts`
- real smoke 1종: `tests/e2e/wrong-note-real-smoke.spec.ts`

운영 체크 세트:

1. `test -d /Users/mark/Library/Application Support/study-project/wrong-notes`
2. `test -d /Users/mark/Library/Application Support/study-project-backups`
3. `du -sk /Users/mark/Library/Application Support/study-project/wrong-notes`
4. wrong-note storage 용량 2GB 초과 시 `HOLD` 판정 후 원인 분석

## 5. FR 매핑 기반 동작 검증 시나리오

1. FR-001 / FR-002 / FR-009
- 대상: 보호자/학생 로그인, guardian/student ownership
- 테스트:
  - `tests/integration/auth-login-route.test.ts`
  - `tests/integration/auth-signup-route.test.ts`
  - `tests/integration/auth-student-activate-route.test.ts`
  - `tests/integration/students-route.test.ts`
  - `tests/integration/wrong-notes-routes.test.ts`
  - `tests/integration/workbook-routes.test.ts`
  - `tests/e2e/wrong-note-real-smoke.spec.ts`
- 기대결과: 타 보호자/타 학생 데이터 접근 차단, role-based routing 정상

2. FR-003 / FR-004 / FR-005 / FR-006 / FR-013
- 대상: wrong-note 생성, filter, chart, image validation
- 테스트:
  - `tests/unit/mistake-note-upload.test.ts`
  - `tests/unit/wrong-note-service.test.ts`
  - `tests/integration/wrong-notes-routes.test.ts`
  - `tests/real-integration/wrong-notes-real.test.ts`
  - `tests/e2e/wrong-note-dashboard.spec.ts`
- 기대결과: 학년/학기/단원/오류유형 검증, chart 집계, guarded image 정책 일치

3. FR-002A / FR-002B / FR-002C / FR-004A / FR-004B / FR-004C
- 대상: workbook template, assignment, progress matrix
- 테스트:
  - `tests/unit/workbook-service.test.ts`
  - `tests/integration/workbook-routes.test.ts`
  - `tests/real-integration/workbook-progress-real.test.ts`
  - `tests/e2e/wrong-note-dashboard.spec.ts`
- 기대결과: template/stage validation, assignment ownership, matrix default/status cycle 정상

4. FR-007 / FR-007A / FR-008 / FR-010 / FR-011
- 대상: wrong-note 상세 수정, workbook linkage, soft delete, guardian feedback
- 테스트:
  - `tests/integration/wrong-notes-routes.test.ts`
  - `tests/real-integration/wrong-notes-real.test.ts`
  - `tests/e2e/wrong-note-dashboard.spec.ts`
  - `tests/e2e/wrong-note-real-smoke.spec.ts`
- 기대결과: 상세 저장 후 대시보드 재반영, workbook-linked note 표시, feedback loop 정상

5. FR-012
- 대상: legacy surface redirect
- 테스트:
  - `tests/e2e/wrong-note-dashboard.spec.ts`
  - 수동 확인: `/records/new`, `/study/content`, `/study/reviews`, `/student/study/session`, `/student/progress`, `/student/wrong-answers`
- 기대결과: wrong-note home으로 일관되게 redirect

## 6. Public API 검증 대상 목록

- `/api/v1/auth/login`, `/api/v1/auth/signup`, `/api/v1/auth/student-activate`, `/api/v1/auth/logout`
- `/api/v1/students`, `/api/v1/students/{id}/invite`, `/api/v1/students/{id}/invite/reset`
- `/api/v1/curriculum`
- `/api/v1/student/wrong-notes`, `/api/v1/student/wrong-notes/dashboard`, `/api/v1/student/wrong-notes/chart`
- `/api/v1/student/wrong-notes/{id}`, `/api/v1/student/wrong-notes/{id}/image`
- `/api/v1/wrong-notes`, `/api/v1/wrong-notes/dashboard`, `/api/v1/wrong-notes/chart`
- `/api/v1/wrong-notes/{id}`, `/api/v1/wrong-notes/{id}/image`, `/api/v1/wrong-notes/{id}/feedback`
- `/api/v1/workbook-templates`, `/api/v1/workbook-templates/{id}`
- `/api/v1/student-workbooks`, `/api/v1/student-workbooks/{id}`
- `/api/v1/student/workbook-progress`, `/api/v1/student/workbook-progress/dashboard`
- `/api/v1/workbook-progress`, `/api/v1/workbook-progress/dashboard`

정책:

- 본 플랜은 현재 실제 게이트와 운영 스크립트를 소스 오브 트루스로 본다.
- legacy page redirect shim은 계속 검증하되, 제거된 legacy API는 게이트 대상이 아니라 `404` contract로 본다.

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
3. `verify:pr`/`verify:release`는 `prisma migrate deploy` + `prisma:seed`를 선행 실행한다.
4. 문서 변경이 포함되면 `check-doc-links.sh`를 항상 실행한다.
5. 릴리즈 판정 예외는 두지 않고 필수 게이트 전부 통과 시에만 `Go`로 판단한다.
6. `demo:seed`는 current WrongNote + Workbook 기준 demo dataset을 주입하고, 학생 실로그인은 별도 활성화가 필요할 수 있다.
