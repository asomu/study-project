# Project Status

- Last Updated: 2026-03-22
- Current Phase: M10 Workbook Progress + Wrong Note Link Verified
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

## 3. Risks and Blocks

- 기능 구현 블로커 없음
- 검증 블로커 없음
- 현재 제품은 수학 과목 + 수동 분류 + 수동 피드백까지 포함한다.
- guardian workbook template 수정 UX는 현재 prompt 기반 제목/출판사 수정이라 후속 polish 여지가 있다.
- OCR, 자동 피드백, 반복 오답 기반 재도전 관리는 아직 없다.
- 과거 `public/uploads/wrong-notes`에 저장되었다가 이미 유실된 파일은 자동 복구되지 않는다.
- 레거시 `attempt / wrong-answer / study` 기능은 코드베이스에 남아 있으므로, 다음 정리 단계에서 완전 제거 여부를 판단해야 한다.
- 레거시 API/도메인 코드는 아직 남아 있으나 UI surface와 수동 운영 기준에서는 비활성 처리되었다.
- 중등 수학 커리큘럼은 2026 기준 학년별 적용 버전이 다르므로, 2027년 중3 개정 전환 시 seed와 authoring 기준을 다시 점검해야 한다.

## 4. Next Actions

1. guardian workbook template 수정 UX를 prompt 기반에서 더 구조화된 inline editor로 다듬을지 결정한다.
2. `pnpm -C apps/web run wrong-note:storage:audit -- --json` 기준으로 누락/고아 파일 점검 루틴을 운영 체크리스트에 편입한다.
3. `pnpm -C apps/web run wrong-note:storage:backup`의 주기와 보관 정책을 확정한다.
4. 레거시 `wrong-answer`/`study` 화면과 API를 완전 제거할지, 호환용으로 유지할지 결정한다.

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
