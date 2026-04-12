# Development Plan

- Plan Version: v1.2
- Last Updated: 2026-04-12

## 1. Milestones

1. M0: 설계/문서화 완료
2. M1: 기반 구축 완료
3. M2: 초기 입력 기능 완료
4. M3: 초기 대시보드 완료
5. M4: 검증/안정화 완료
6. M5: 리포트/추천 확장 보류
7. M6: 학생 학습 루프 확장 완료
8. M7: 학습 콘텐츠 Authoring UI 완료
9. M8: 보호자 통합 Study Dashboard 완료
10. M9: Wrong Note-first Service Rebuild 완료
11. M10: Workbook Progress + Wrong Note Workbook Link 완료

## 2. Current Product Direction

- 현재 기본 제품 경험은 학생/보호자 오답노트 대시보드다.
- 신규 기능과 분석은 `WrongNote`와 `Workbook`을 기준으로 확장한다.
- 레거시 `attempt / wrong-answer / study` 흐름은 코드베이스에 남아 있어도 현재 제품 로드맵의 중심이 아니다.

## 3. M10 Scope Lock (2026-03-22)

포함 범위:

- 신규 Workbook 도메인
  - `WorkbookTemplate`
  - `WorkbookTemplateStage`
  - `StudentWorkbook`
  - `StudentWorkbookProgress`
- 보호자 UI 직접 입력 문제집 템플릿
  - 문제집 이름
  - 출판사
  - 학교급
  - 대상 학년
  - 학기
  - 단계 목록 추가/삭제/순서 변경
- 학생 배정
  - guardian-owned template를 학생에게 배정
  - 배정 보관/복구
- 학생/보호자 공통 workbook progress 대시보드
  - `대상 학년`, `문제집` 컨트롤
  - summary KPI
  - 단원별 완료 단계 수 bar chart
  - `단원 x 단계` matrix
  - 셀 클릭 즉시 상태 변경
- wrong-note workbook 연동
  - `studentWorkbookId`
  - `workbookTemplateStageId`
  - workbook을 고르면 해당 학년/학기 자동 고정
- 신규 API
  - `GET /api/v1/workbook-templates`
  - `POST /api/v1/workbook-templates`
  - `PATCH /api/v1/workbook-templates/{id}`
  - `GET /api/v1/student-workbooks`
  - `POST /api/v1/student-workbooks`
  - `PATCH /api/v1/student-workbooks/{id}`
  - `GET /api/v1/student/workbook-progress/dashboard`
  - `GET /api/v1/workbook-progress/dashboard`
  - `PUT /api/v1/student/workbook-progress`
  - `PUT /api/v1/workbook-progress`
- 문서 동기화
  - `PRD`
  - `SYSTEM_ARCHITECTURE`
  - `DATA_MODEL`
  - `API_SPEC_V1`
  - `DEVELOPMENT_PLAN`
  - `DECISION_LOG`
  - `PROJECT_STATUS`
  - `HANDOFF`
  - `CONTEXT_INDEX`

비포함 범위:

- workbook template import/export
- workbook 단계 구조 배정 후 수정
- workbook 진도 히스토리/일별 로그
- OCR
- 자동 피드백
- PDF/주간 브리프
- 재도전 상태 추적
- 기존 `WrongAnswer` 데이터 이전

## 4. M10 Validation Plan

- Unit
  - workbook stage 정렬/중복 검증
  - matrix 기본값 `not_started`
  - summary/bar 집계
- Route-contract
  - guardian template/assignment 권한
  - student/guardian workbook progress ownership
  - wrong-note workbook linkage validation
- Real integration
  - 보호자 template 생성 -> 학생 배정 -> 학생 상태 변경 -> 보호자 반영
  - wrong-note create/update에 workbook linkage 저장
- E2E
  - guardian template 등록
  - 학생 진도 상태 변경
  - wrong-note에 workbook/stage 연결
  - real smoke

## 5. Deferred Backlog

### Post-M10 Recovery Workstream

- 문서 truth reset: `PROJECT_STATUS` -> `CONTEXT_INDEX` / `HANDOFF` / `DEVELOPMENT_PLAN` 재동기화
- 문서 drift cleanup: README / USER_GUIDE / bootstrap docs wording 정리
- active vs leftover module classification 고정
- CI gate policy와 문서 기준 비교 및 정렬

### M5 Deferred

- 주간 브리프 / PDF 리포트
- 추천 규칙 확장
- 자동 코멘트 생성

### Wrong Note 후속 범위

- OCR 기반 문제 텍스트 보조 입력
- 반복 오답 추적과 재도전 상태
- 피드백 템플릿
- 다과목 확장

### Workbook 후속 범위

- 템플릿 JSON import/export
- 단계 구조 템플릿 편집기 고도화
- 진도 변경 히스토리/활동 로그
- 정체 단원 알림/추천
