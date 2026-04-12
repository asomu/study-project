# Project Status

- Last Updated: 2026-04-12
- Current Phase: M10 Current Product Baseline Locked
- Overall Progress: 100%

## 1. Milestone Status

| Milestone | Status | Progress | Owner | Notes |
| --- | --- | --- | --- | --- |
| M0 설계/문서화 | COMPLETED | 100% | Team | 기본 문서/프로세스 세트 구축 완료 |
| M1 기반 구축 | COMPLETED | 100% | Team | 인증, 학생/보호자 라우팅, Prisma/테스트 기반 완료 |
| M2 초기 입력 기능 | COMPLETED | 100% | Team | 문제집/시도/오답 입력 초기 버전 완료 |
| M3 초기 대시보드 | COMPLETED | 100% | Team | overview/weakness/trends 초기 분석 완료 |
| M4 검증/안정화 | COMPLETED | 100% | Team | 회귀 게이트와 운영 체크리스트 고정 완료 |
| M5 리포트/추천 확장 | DEFERRED | 0% | Team | PDF/브리프/추천 고도화는 후속 범위 |
| M6 학생 학습 루프 확장 | COMPLETED | 100% | Team | study 모듈 및 학생 self-service 흐름 완료 |
| M7 학습 콘텐츠 Authoring UI | COMPLETED | 100% | Team | guardian/admin authoring 완료 |
| M8 보호자 통합 Study Dashboard | COMPLETED | 100% | Team | study insight 통합 대시보드 완료 |
| M9 Wrong Note-first Service Rebuild | COMPLETED | 100% | Team | `WrongNote` 모델, 학생/보호자 오답노트 대시보드, 전용 API/테스트/문서 동기화 완료 |
| M10 Workbook Progress + Wrong Note Workbook Link | COMPLETED | 100% | Team | 보호자 문제집 템플릿/배정, 학생·보호자 공통 진도 matrix, 오답노트 문제집 연동 완료 |

## 2. Current Sprint Focus

- [x] 신규 `WrongNote` 데이터 모델 도입
- [x] Prisma schema + migration + serializer/service/contracts 추가
- [x] 학생 Wrong Note API 구현
  - `POST /api/v1/student/wrong-notes`
  - `GET /api/v1/student/wrong-notes/dashboard`
  - `GET /api/v1/student/wrong-notes`
  - `GET /api/v1/student/wrong-notes/{id}`
  - `PATCH /api/v1/student/wrong-notes/{id}`
  - `POST /api/v1/student/wrong-notes/{id}/image`
  - `DELETE /api/v1/student/wrong-notes/{id}`
- [x] 보호자 Wrong Note API 구현
  - `GET /api/v1/wrong-notes/dashboard`
  - `GET /api/v1/wrong-notes`
  - `GET /api/v1/wrong-notes/{id}`
  - `PUT /api/v1/wrong-notes/{id}/feedback`
- [x] 학생 대시보드 `/student/dashboard`를 오답노트 홈으로 교체
- [x] 보호자 대시보드 `/dashboard`를 오답노트 허브로 교체
- [x] 오답 현황 그래프 추가
  - 학생 퀵업로드 아래 / 보호자 학생 선택 아래에 가로 bar 차트 섹션 추가
  - `그래프 기준 / 대상 학년 / 학기` 독립 콤보박스 추가
  - student/guardian chart API 추가
  - `단원별 오답 현황`은 0건 단원까지 포함
  - `오류유형별 오답 현황`은 3개 고정 순서 유지
- [x] 레거시 진입점 리다이렉트
  - `/student/wrong-answers`
  - `/wrong-answers/manage`
- [x] 레거시 제품 surface 정리
  - guardian/student 상단 네비게이션을 wrong-note 기준으로 단순화
  - `/records/new`, `/study/content`, `/study/reviews`, `/student/study/session`, `/student/progress` 직접 접근 시 wrong-note 홈으로 리다이렉트
  - 수동 QA 체크리스트와 verification gate를 wrong-note 기준으로 갱신
- [x] 업로드 경로 분리
  - `~/Library/Application Support/study-project/wrong-notes`
- [x] 선행 학년 선택 지원
  - 학생 현재 학년과 별개로 같은 학교급 안의 대상 학년을 업로드/수정/필터에서 선택 가능
  - route validation과 curriculum lookup을 선택 학년 기준으로 갱신
  - seed curriculum에 중1~중3 / 1~2학기 샘플 단원 추가
- [x] Hybrid TDD 검증
  - unit
  - route-contract/integration
  - real integration
  - mocked e2e
  - real smoke e2e
- [x] 로컬 디스크 저장소 하드닝
  - wrong-note 이미지 저장소를 repo 밖 앱 데이터 루트로 이동
  - `GET /api/v1/student/wrong-notes/{id}/image`
  - `GET /api/v1/wrong-notes/{id}/image`
  - storage audit / backup script 추가
  - missing image placeholder와 legacy path 호환 추가
- [x] 문서 동기화
  - `PRD`
  - `SYSTEM_ARCHITECTURE`
  - `DATA_MODEL`
  - `API_SPEC_V1`
  - `DEVELOPMENT_PLAN`
  - `DECISION_LOG`
  - `PROJECT_STATUS`
  - `HANDOFF`
  - `CONTEXT_INDEX`
- [x] 문제집 진도 도메인 추가
  - `WorkbookTemplate`
  - `WorkbookTemplateStage`
  - `StudentWorkbook`
  - `StudentWorkbookProgress`
- [x] 보호자 문제집 템플릿 API/UI 구현
  - `GET /api/v1/workbook-templates`
  - `POST /api/v1/workbook-templates`
  - `PATCH /api/v1/workbook-templates/{id}`
  - 대시보드 내 직접 입력 폼과 단계 순서 조정 UI
- [x] 학생 문제집 배정 API/UI 구현
  - `GET /api/v1/student-workbooks`
  - `POST /api/v1/student-workbooks`
  - `PATCH /api/v1/student-workbooks/{id}`
- [x] workbook progress dashboard/API 구현
  - `GET /api/v1/student/workbook-progress/dashboard`
  - `GET /api/v1/workbook-progress/dashboard`
  - `PUT /api/v1/student/workbook-progress`
  - `PUT /api/v1/workbook-progress`
  - summary KPI, 단원별 완료 단계 수 bar chart, `단원 x 단계` matrix
- [x] wrong-note workbook linkage 구현
  - `wrong_notes.student_workbook_id`
  - `wrong_notes.workbook_template_stage_id`
  - 학생 업로드/상세에서 문제집 + 단계 선택
  - 카드/상세에 문제집명/출판사/단계명 표시
- [x] Hybrid TDD 검증 확장
  - workbook unit
  - workbook route-contract/integration
  - workbook real integration
  - mocked e2e wrong-note + workbook flow
  - real smoke e2e
- [x] legacy wrong-answer/study runtime 제거
  - redirect-only shim page는 유지
  - legacy API route/runtime/test surface 제거
  - wrong-note storage helper를 shared module로 분리
  - `demo:seed`를 current WrongNote + Workbook dataset 기준으로 재구성
- [x] 보호영역 사이드바 대시보드 셸 refresh
  - 공통 `AppShell`을 좌측 사이드바 + 상단 sticky utility bar 구조로 재구성
  - 학생/보호자 대시보드에 section anchor 탐색과 모바일 drawer를 추가
  - 보호자 `학생 선택`, `학생 보기 / 문제집 관리` 토글을 header action으로 이동

## 3. Risks and Blocks

- 기능 구현 블로커 없음
- 검증 블로커 없음
- 현재 제품은 초등/중등 수학 과목 + 수동 분류 + 수동 피드백까지 포함한다.
- guardian/student 공통 wrong-note workspace는 isolated QA schema 기준 360px/390px 모바일에서 이미지 업로드, 상세 dialog, 보호자 피드백 저장까지 통과했다. 2026-03-22 후속 모바일 로그인 QA에서는 student/guardian 모두 console error 0건이었고 `ERR_INSUFFICIENT_RESOURCES`는 재현되지 않았다. 현재는 stale request abort에 따른 `net::ERR_ABORTED`만 남아 있어, heavy soak 상황에서 추가 fan-out이 다시 보이는지만 계속 관찰하면 된다.
- 2026-03-22 storage audit dry-run 기준 `wrongNoteCount=1`, `missingCount=1`, `orphanCount=0`이며, 누락 1건은 legacy `/uploads/wrong-notes/...` 경로라 자동 복구되지 않는다.
- latest backup archive `study-project-20260322-205441.tar.gz`는 `/Users/mark/Documents/project/study-project/output/restore-smoke/20260322-restore-check`에 정상 복구되며, 현재 archive payload는 빈 `study-project/wrong-notes` 디렉터리 baseline이다.
- OCR, 자동 피드백, 반복 오답 기반 재도전 관리는 아직 없다.
- legacy `attempt / wrong-answer / study` 런타임과 API는 제거됐지만, Prisma legacy 테이블 drop migration은 후속 배치로 남아 있다.
- `demo:seed`는 current WrongNote + Workbook dataset으로 재구성됐지만, 학생 실로그인 시연은 여전히 별도 활성화가 필요할 수 있다.
- 중등 수학 커리큘럼은 2026 기준 학년별 적용 버전이 다르므로, 2027년 중3 개정 전환 시 seed와 authoring 기준을 다시 점검해야 한다.

## 4. Next Actions

1. 프로젝트 상태 truth reset 기준으로 `CONTEXT_INDEX`, `HANDOFF`, `DEVELOPMENT_PLAN`, README 계열 drift를 계속 정리한다.
2. `quality.yml` 변경 이후 CI에서 `pnpm verify:pr` 경로 기반 게이트가 안정적으로 도는지 확인한다.
3. Prisma legacy 테이블 cleanup 범위를 별도 배치로 확정한다.
4. wrong-note workspace의 stale request abort가 heavy soak/mobile 반복 탐색에서도 추가 문제를 만들지 관찰한다.
5. storage audit baseline의 legacy missing 1건을 운영상 known issue로 유지할지, 별도 정리 표식으로 관리할지 결정한다.
6. demo 시나리오에서 학생 실로그인까지 필요한 경우 seed 학생 활성화 보조 절차를 둘지 결정한다.

## 5. Change Log

- 2026-02-20: 계획 문서 세트 초기 생성
- 2026-02-21: M1 기반 구축 완료
- 2026-02-21: M2 초기 입력/API/오답 이미지 업로드 완료
- 2026-02-21: M3 초기 대시보드 완료
- 2026-02-28: M4 회귀 게이트/운영 체크리스트 고정 완료
- 2026-03-07: 실사용 전환용 보호자 가입 + 학생 활성화 모델 완료
- 2026-03-08: M6 학생 학습 루프 구현 완료
- 2026-03-14: M7 학습 콘텐츠 authoring 완료
- 2026-03-15: M8 보호자 통합 Study Dashboard 완료
- 2026-03-17: HEIC/HEIF wrong-answer 업로드 지원 보강
- 2026-03-21: M9 Wrong Note-first Service Rebuild 완료
  - `WrongNote` 전용 데이터 모델/업로드 경로/API 추가
  - 학생 `/student/dashboard`와 보호자 `/dashboard`를 오답노트 전용 워크스페이스로 교체
  - mocked e2e + real smoke까지 재검증 완료
- 2026-03-21: M9 closeout cleanup 완료
  - 레거시 학습/기록 페이지 직접 접근을 wrong-note 홈으로 리다이렉트
  - 상단 네비게이션에서 legacy study surface 제거
  - 수동 QA 체크리스트와 release gate backup 경로를 wrong-note 기준으로 갱신
- 2026-03-21: M9 advanced-grade wrong-note follow-up 완료
  - 학생이 현재 학년과 다른 대상 학년(예: 중1 학생의 중2/중3 단원)을 선택할 수 있게 업로드/상세/필터를 확장
  - student/guardian wrong-note list API와 student create/update validation에 `grade` 지원 추가
  - seed curriculum을 중1~중3 / 1~2학기 샘플까지 확장하고 real integration/e2e 재검증 완료
- 2026-03-21: M9 wrong-note chart follow-up 완료
  - 학생/보호자 대시보드에 `오답 현황 그래프` bar 차트 섹션 추가
  - `GET /api/v1/student/wrong-notes/chart`, `GET /api/v1/wrong-notes/chart` 추가
  - 단원별 0건 포함 bar chart, 오류유형별 고정 순서 bar chart 구현
  - mocked e2e, real integration, real smoke 재검증 완료
- 2026-03-22: M9 wrong-note local storage hardening 완료
  - wrong-note 이미지 저장소를 `~/Library/Application Support/study-project/wrong-notes`로 분리
  - `imagePath` 응답을 guarded image API URL로 전환
  - student/guardian image GET route, audit script, backup script 추가
  - test storage를 `apps/web/.tmp/test-data/wrong-notes`로 분리하고 회귀 검증 완료
- 2026-03-22: wrong-note 단원 선택 커리큘럼 현재 기준 재정비 완료
  - wrong-note `curriculum_nodes`를 2026-03-22 현재 적용 버전 기준으로 재구성
  - 중1/중2는 `2022.12`, 중3은 `2015.09` active catalog로 반영
  - 학년·학기별 대표 단원을 현재 교과과정 기준으로 확장해 콤보박스 선택 폭 보강
  - `prisma:seed`, mocked e2e, real integration, real smoke 재검증 완료
- 2026-03-22: M10 workbook progress + wrong-note workbook link 완료
  - guardian workbook template 등록/활성 관리, 학생 workbook 배정/보관 API와 대시보드 UI 추가
  - 학생/보호자 공통 workbook progress summary, 단원별 완료 단계 bar chart, `단원 x 단계` matrix 추가
  - `PUT /api/v1/student/workbook-progress`, `PUT /api/v1/workbook-progress`로 상태 변경 지원
  - `wrong_notes.student_workbook_id`, `wrong_notes.workbook_template_stage_id`를 추가하고 학생 업로드/상세에서 workbook/stage 연결 지원
  - workbook unit/integration/real integration 테스트와 wrong-note mocked e2e 재검증 완료
- 2026-03-22: M10 closeout cleanup 완료
  - guardian dashboard에서 문제집 템플릿 카탈로그와 학생 배정 목록을 분리해, 배정되지 않은 템플릿도 수정/활성 관리 가능하게 정리
  - workbook progress dashboard가 선택 학년에 맞는 문제집이 없을 때 다른 학년 문제집으로 fallback하지 않도록 수정
  - workbook integration test, mocked/real e2e, build, lint, link check 재검증 완료
- 2026-03-22: wrong-note/workbook UX polish follow-up 완료
  - guardian workbook template 수정 UI를 `prompt`에서 inline editor로 교체
  - 학생 빠른 업로드를 기본 입력 + 선택 입력 접기 구조로 단순화
  - guardian dashboard를 `학생 보기` / `문제집 관리` 모드로 분리하고, workbook matrix에 모바일 카드형 대안을 추가
  - 핵심 KPI를 workbook/chart/filter보다 먼저 배치하고, 상세 드로어를 keyboard 접근 가능한 dialog로 정리
  - `wrong-note-dashboard.spec.ts`, `typecheck`, `lint`, mocked e2e, build 재검증 완료
- 2026-03-22: 현재 제품 기술 학습 문서 동기화
  - `docs/01-product/TECH_STACK.md`를 현재 구현 기준으로 갱신
  - `docs/07-learning/notes/2026-03-22-current-product-tech-explainer.md` 추가
  - `docs/07-learning/TECH_EXPLAINER_INDEX.md` 갱신
- 2026-03-22: 기술 스택 심화 학습 문서 보강
  - `JWT + 권한 흐름`, `Prisma 데이터 모델`, `Workbook progress matrix` 심화 노트 추가
  - `docs/07-learning/TECH_EXPLAINER_INDEX.md`에 후속 학습 순서 반영
- 2026-03-22: M10 documentation audit + guide refresh 완료
  - `TEST_AND_VALIDATION`, `M4_REVIEW_AND_TEST_PLAN`, `USER_E2E_MANUAL_CHECKLIST`, `DEMO_RUNBOOK`를 current WrongNote + Workbook 기준으로 재정리
  - `USER_GUIDE`를 신규 추가하고 `docs/README`, `docs/INDEX`, `apps/web/README` 네비게이션을 갱신
  - `demo:seed`의 legacy scope limitation을 운영 문서에 명시
- 2026-03-22: mobile QA follow-up 완료
  - 360px/390px 기준 guardian/student wrong-note workspace를 실제 브라우저로 점검
  - 공통 `AppShell` 헤더를 모바일 세로 스택으로 조정하고 `로그아웃` 버튼 줄바꿈을 제거
  - `.next-*` QA dist 디렉터리가 lint/git 상태를 흔들지 않도록 ignore 규칙을 일반화
- 2026-03-22: mobile deep interaction QA + async request hardening 완료
  - isolated QA schema 기준 학생 이미지 업로드, 학생 상세 메모 저장, 보호자 피드백 저장 모바일 실브라우저 QA를 통과
  - 상세 dialog가 background fetch 실패를 글로벌 배너로 노출하지 않도록 detail-local message/error 상태를 분리
  - wrong-note workspace의 workspace/chart/workbook reload가 stale request를 abort하고 stable student primitive 기준으로만 후속 fetch를 다시 트리거하도록 하드닝
  - `typecheck`, `lint`, mocked e2e, `build`, doc link check 재검증 완료
- 2026-03-22: wrong-note storage audit baseline + backup verification 완료
  - live storage audit dry-run 결과 `wrongNoteCount=1`, `missingCount=1`(`legacy`), `orphanCount=0`
  - 누락 1건은 legacy `/uploads/wrong-notes/...` 경로로 자동 복구 대상이 아님을 운영 baseline으로 기록
  - `wrong-note:storage:backup` 실행으로 app backup root에 archive 생성 확인
  - `OPERATIONS_CHECKLIST`, `PROJECT_STATUS`, `HANDOFF`, `CONTEXT_INDEX`에 audit cadence / 대응 규칙 / baseline을 반영
- 2026-03-22: backup restore smoke + mobile async follow-up 확인
  - latest backup archive `study-project-20260322-205441.tar.gz`를 `output/restore-smoke/20260322-restore-check`에 정상 복구 확인
  - 현재 archive payload는 빈 `study-project/wrong-notes` 디렉터리 baseline
  - mobile follow-up login QA에서 student/guardian 모두 console error 0건, `ERR_INSUFFICIENT_RESOURCES` 미재현 확인
  - 네트워크에는 stale request 정리에 따른 `net::ERR_ABORTED`만 남으며, 추가 fan-out 여부는 soak 관찰 대상으로 유지
- 2026-03-22: study code cleanup closeout 완료
  - current uncommitted scope review에서 추가 release blocker를 발견하지 못했다.
  - `pnpm -C apps/web prisma:seed`, `pnpm -C apps/web exec vitest run tests/integration/curriculum-route.test.ts`, `pnpm -C apps/web typecheck`, `pnpm -C apps/web lint` 재통과
  - 문서 closeout 반영 후 `bash scripts/check-doc-links.sh` 재통과
- 2026-03-22: workbook contract hardening review closeout 완료
  - inactive workbook template은 학생 배정에서 차단하도록 API 계약을 보강
  - student/guardian workbook progress dashboard는 잘못된 `studentWorkbookId` 요청에 fallback 대신 `404`를 반환하도록 수정
  - workbook integration test, targeted lint/typecheck, PR verification gate path filter를 재검증
- 2026-03-22: Study Code Cleanup verification follow-up 완료
  - `WrongNoteWorkspace`의 abort-safe fetch에서 `response.json()` abort를 삼켜 `null payload` 런타임 크래시로 이어질 수 있던 경로를 `readJsonOrNull` helper로 정리
  - 상세 드로어 fetch를 abort-safe하게 보강하고 detail 삭제 실패도 dialog-local error로 정리
  - mocked e2e의 학생 업로드 selector를 현재 `선택 입력` 구조에 맞게 재고정하고 guardian stale-card regression test 타입을 정리
  - `eslint.config.mjs`에 `test-results/**` ignore를 추가해 Playwright 산출물이 lint 입력에 섞이지 않게 정리
  - `pnpm -C apps/web lint`, `pnpm -C apps/web typecheck`, `pnpm -C apps/web test:e2e:mocked` 재통과
- 2026-03-22: 초등 수학 현재 교육과정 seed 확장 완료
  - wrong-note `curriculum_nodes`에 초1~초6 / 1~2학기 대표 단원을 추가
  - 2026-03-22 기준 초1~초6 전체를 `2022.12` active catalog로 반영
  - 공식 적용 일정과 초등 단원 정규화 근거를 `docs/06-data/ELEMENTARY_MATH_CURRENT_CURRICULUM_2026-03-22.md`에 기록
  - `prisma:seed`, `curriculum-route.test.ts`, `typecheck`, `lint`, doc link check를 재검증
- 2026-03-23: legacy wrong-answer/study runtime 제거 완료
  - `@/modules/mistake-note/upload`에서 current wrong-note storage helper를 `modules/shared/wrong-note-storage`로 분리
  - legacy wrong-answer/study/dashboard API route, dead panel/component, 관련 회귀 테스트를 삭제하고 redirect shim page만 유지
  - `demo:seed`와 real integration demo 검증을 current WrongNote + Workbook dataset 기준으로 재구성
  - verification gate와 아키텍처/품질/운영 문서를 current runtime 기준으로 동기화
  - `pnpm -C apps/web typecheck`, `pnpm -C apps/web lint`, `pnpm -C apps/web test`, `pnpm -C apps/web build`, `pnpm -C apps/web test:e2e`, `pnpm -C apps/web prisma:seed`, `pnpm -C apps/web demo:seed`, `pnpm -C apps/web demo:clear`, `pnpm -C apps/web run wrong-note:storage:audit -- --json`, `bash scripts/check-doc-links.sh` 재통과
- 2026-03-24: study-code-cleanup closeout 완료
  - findings-first review에서 추가 release blocker를 발견하지 못했다.
  - legacy runtime 제거 이후 남은 historical learning-note broken link를 current 문서/구현 경로로 정리했다.
  - `bash scripts/check-doc-links.sh` 재통과로 문서 무결성을 다시 확인했다.
- 2026-04-03: 보호영역 사이드바 대시보드 UX refresh 완료
  - 공통 `AppShell`을 사이드바 + sticky utility bar + 모바일 drawer 구조로 재구성했다.
  - 학생 대시보드는 `개요 / 빠른 업로드 / 문제집 진도 / 오답 그래프 / 오답 탐색`, 보호자 대시보드는 모드별 section anchor 탐색을 제공하도록 정리했다.
  - `학생 선택`, `학생 보기 / 문제집 관리` 토글을 header action으로 이동하고, 오답 탐색 영역을 desktop sticky filter rail 구조로 재배치했다.
  - `pnpm -C apps/web typecheck`, `pnpm -C apps/web lint`, `pnpm -C apps/web test:e2e:mocked`, `pnpm -C apps/web build` 재통과
- 2026-04-12: project recovery baseline 문서화
  - `PROJECT_RECOVERY_PLAN`, `DOC_SYNC_CHECKLIST`, `MODULE_CLASSIFICATION` 추가
  - bootstrap/README/user guide wording drift 정리
  - 현재 관리 공백의 핵심 문제를 문서/구조 drift로 재정의
- 2026-04-12: verification/worktree cleanup baseline 정리
  - `quality.yml`을 문서 기준 `pnpm verify:pr` 정책에 맞추고 Playwright browser 설치를 포함하도록 정리
  - release/quality workflow와 `.env.example`에서 미사용 `UPLOAD_DIR` 설정을 제거
  - empty leftover module directory(`analytics`, `assessment`, `mistake-note`, `study`)를 제거
 - 2026-04-12: shared utility naming cleanup
   - `modules/dashboard/date-range.ts`를 `modules/shared/date-range.ts`로 이동해 current runtime이 legacy-like module name에 의존하지 않게 정리
   - 로컬 `apps/web/.env`의 미사용 `UPLOAD_DIR` 설정을 제거
