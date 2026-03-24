# Test and Validation Strategy

- Last Updated: 2026-03-23
- Scope: Wrong-note-first + workbook-progress private beta
- Audience: 개발자 / 리뷰어 / 운영자

## 1. 테스트 접근 방식

권장: Hybrid TDD

- 도메인 로직: TDD 우선
- Route handler/API 계약: route-contract 테스트
- DB 연동 흐름: real integration 테스트
- 브라우저 UI: mocked regression + real smoke

## 2. 왜 Hybrid TDD인가

- 전면 TDD는 화면 조합이 많은 대시보드 작업 속도를 과도하게 늦출 수 있다.
- `WrongNote`와 `Workbook`의 계산/검증/권한 로직은 TDD가 회귀 방지 효과가 크다.
- 학생/보호자 대시보드는 통합/E2E로 한 번 더 검증하는 편이 운영 신뢰도에 유리하다.

## 3. 현재 핵심 검증 대상

- 학생 WrongNote 생성/조회/수정/삭제
- 보호자 WrongNote 조회/피드백 저장
- WrongNote chart, filter, guarded image API
- repo 밖 wrong-note 저장소와 legacy path 호환
- Workbook template 생성/활성 관리
- Student workbook 배정/보관
- workbook progress KPI, 단원별 bar chart, `단원 x 단계` matrix
- wrong-note workbook linkage와 grade/semester/stage 검증
- 학생/보호자 role guard 및 ownership chain
- 레거시 page redirect shim 동작

## 4. 테스트 레벨

1. Unit
- wrong-note serializer/service validation
- workbook stage 정렬/중복 검증
- matrix 기본값 `not_started`
- summary/bar 집계
- wrong-note storage root/path 해석과 legacy image path 호환

2. Route-contract
- Next route handler의 요청/응답/에러 코드 계약 검증
- Prisma/외부 의존성은 mock 처리
- 주요 대상:
  - `/api/v1/student/wrong-notes*`
  - `/api/v1/wrong-notes*`
  - `/api/v1/workbook-templates*`
  - `/api/v1/student-workbooks*`
  - `/api/v1/student/workbook-progress*`
  - `/api/v1/workbook-progress*`

3. Real Integration
- PostgreSQL + Prisma + migration/seed 기준으로 API + DB + 업로드 흐름 검증
- wrong-note/workbook end-to-end persistence
- current curriculum version selection과 storage 동작 검증

4. E2E
- mocked UI regression: `tests/e2e/wrong-note-dashboard.spec.ts`
- real smoke: `tests/e2e/wrong-note-real-smoke.spec.ts`
- 현재 E2E surface는 wrong-note workspace 안의 workbook progress UI까지 함께 검증한다.

## 5. 도구

- Unit/Route-contract/Real Integration: Vitest
- E2E: Playwright
- Quality: ESLint, TypeScript, Next build, doc link checker

## 6. 품질 게이트

- PR 기준
  - `pnpm verify:pr`
  - 기본 세트: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `bash scripts/check-doc-links.sh`
  - changed-path rule: 현재 스크립트는 wrong-note/dashboard workspace 변경 시 `tests/e2e/wrong-note-dashboard.spec.ts`를 추가 실행한다.
- 릴리즈 기준
  - `pnpm verify:release`
  - 기본 세트: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm test:e2e`
  - 운영 세트: `pnpm -C apps/web run wrong-note:storage:audit -- --json`, `bash scripts/check-doc-links.sh`
  - wrong-note storage/backup directory 존재 여부와 wrong-note storage 2GB threshold를 함께 확인한다.

### 6.1 실행 명령 표준화

- PR 스모크 게이트: `pnpm verify:pr`
- 릴리즈 풀회귀 게이트: `pnpm verify:release`
- 상세 게이트 설명: `/Users/mark/Documents/project/study-project/docs/04-quality/M4_REVIEW_AND_TEST_PLAN.md`
- 수동 검증 체크리스트: `/Users/mark/Documents/project/study-project/docs/04-quality/USER_E2E_MANUAL_CHECKLIST.md`
- 운영/시연 절차: `/Users/mark/Documents/project/study-project/docs/05-operations/DEMO_RUNBOOK.md`

## 7. 현재 고정 회귀 세트 (2026-03-22 baseline)

- student wrong-note create/list/dashboard/chart/detail/update/delete
- guardian wrong-note dashboard/list/detail/feedback/image
- selected grade/semester/unit validation
- workbook template create/update/activate
- student workbook assignment/archive
- workbook progress dashboard, KPI, bar chart, matrix status cycle
- wrong-note workbook linkage validation
- missing image placeholder + legacy image path compatibility
- 레거시 redirect surface

## 8. 권한/데이터 리스크 검증 포인트

- 보호자 A가 보호자 B의 `studentId`로 요청 시 `403` 또는 `404`
- 학생이 다른 학생의 `wrongNoteId` 또는 `studentWorkbookId`를 사용할 수 없어야 한다.
- workbook을 선택한 wrong-note는 stage가 필수이며 grade/semester가 workbook template과 일치해야 한다.
- 빈 문자열 피드백 저장 시 기존 피드백이 제거되어야 한다.
- MIME이 허용되어도 파일 시그니처가 다르면 업로드를 거부해야 한다.
- `asOfDate` 기준 커리큘럼 버전 선택이 현재 적용 학년과 일치해야 한다.

## 9. FR-테스트 추적 규칙

- FR-001/003/004/005/006/007A/013은 Unit + Route-contract + Real Integration으로 기본 검증한다.
- FR-002A/002B/002C/004A/004B/004C는 Unit + Route-contract + mocked E2E를 포함한다.
- FR-007/008/009/010/011/012는 Route-contract + Real Integration + smoke를 포함한다.
- PR마다 변경된 FR ID를 PR 설명에 기록하고 대응 테스트를 연결한다.

## 10. 분류 규칙

- `tests/unit`: 도메인/계산/validation
- `tests/integration`: mocked route-contract
- `tests/real-integration`: Prisma + PostgreSQL real integration
- `tests/e2e/*.spec.ts`: mocked UI regression
- `tests/e2e/wrong-note-real-smoke.spec.ts`: 실서버/실DB smoke

## 11. 수동 검증 문서 연결

- 사용자 핵심 루프 수동 QA: `/Users/mark/Documents/project/study-project/docs/04-quality/USER_E2E_MANUAL_CHECKLIST.md`
- 보호자/학생 실제 사용 흐름: `/Users/mark/Documents/project/study-project/docs/05-operations/USER_GUIDE.md`
- 데모 준비/시연: `/Users/mark/Documents/project/study-project/docs/05-operations/DEMO_RUNBOOK.md`

## 12. Deferred Scope

- OCR
- 자동 피드백
- 재도전 상태 추적
- PDF/주간 리포트
