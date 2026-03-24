# System Architecture

- Date: 2026-03-23
- Scope: Wrong-note-first + workbook-progress private beta

## 1. 아키텍처 스타일

- 모듈형 모놀리식
- Next.js App Router + Prisma + PostgreSQL
- 이미지 저장은 로컬 파일시스템이되 git repo 밖 앱 데이터 루트로 분리한다.
- 오답노트 + 문제집 진도 대시보드가 학생/보호자 기본 진입 경험

## 2. 논리 모듈

- Auth/Family
  - 보호자 가입
  - 학생 초대/활성화
  - 역할별 보호 라우팅
- Curriculum
  - 학교급/학년/학기/단원 조회
  - 학생 학교급 + 선택 학년/학기 기준 단원 유효성 검증
- WrongNote
  - `WrongNote` CRUD
  - 이미지 업로드/교체
  - 보호자 피드백
  - soft delete
- Workbook
  - 보호자 문제집 템플릿 등록
  - 학생 문제집 배정/보관
  - 단원 x 단계 진도 matrix 계산
  - 학생/보호자 상태 변경
- Dashboard
  - `WrongNote` 기반 KPI
  - `Workbook` 기반 progress KPI
  - 단원별 완료 단계 수 bar chart
  - 바 차트 기반 분포 시각화
    - 단원별 오답 현황
    - 오류유형별 오답 현황
  - 필터 기반 카드 탐색
- Legacy Compatibility
  - legacy page URL은 redirect shim만 유지한다.
  - legacy `/uploads/wrong-notes/...` image path는 read-only 호환만 유지한다.
  - legacy wrong-answer/study/dashboard runtime/API는 제거되었고, 이번 배치에서는 DB 테이블만 dormant 상태로 남긴다.

## 3. 현재 핵심 데이터 저장소

- `users`
- `user_credential_identifiers`
- `students`
- `student_invites`
- `curriculum_nodes`
- `wrong_notes`
- `workbook_templates`
- `workbook_template_stages`
- `student_workbooks`
- `student_workbook_progresses`

Dormant legacy tables:

- `materials`
- `attempts`
- `attempt_items`
- `wrong_answers`
- `wrong_answer_categories`
- `practice_sets`
- `practice_problems`
- `concept_lessons`
- `study_work_artifacts`
- `study_reviews`
- `student_unit_progress`
- `mastery_snapshots`

## 4. 핵심 관계

- `users(guardian)` 1:N `students`
- `users` 1:N `user_credential_identifiers`
- `students` 0..1:1 `users(student login)`
- `students` 1:N `student_invites`
- `students` 1:N `wrong_notes`
- `curriculum_nodes` 1:N `wrong_notes`
- `users(guardian)` 1:N `wrong_notes` via `guardian_feedback_by_user_id` when feedback exists
- `users(guardian)` 1:N `workbook_templates`
- `workbook_templates` 1:N `workbook_template_stages`
- `students` 1:N `student_workbooks`
- `workbook_templates` 1:N `student_workbooks`
- `student_workbooks` 1:N `student_workbook_progresses`
- `curriculum_nodes` 1:N `student_workbook_progresses`
- `workbook_template_stages` 1:N `student_workbook_progresses`
- `student_workbooks` 1:N `wrong_notes` when workbook-linked
- `workbook_template_stages` 1:N `wrong_notes` when workbook-linked

## 5. WrongNote 모델 경계

- `WrongNote`는 현재 제품의 오답 소스 오브 트루스다.
- `WrongNote`는 `Attempt`나 `WrongAnswer`에 의존하지 않는다.
- 학생이 사진 1장과 분류 정보로 직접 1건을 생성한다.
- 보호자 피드백은 같은 엔티티에 직접 기록한다.
- 삭제는 hard delete가 아니라 `deleted_at` soft delete다.

## 6. Workbook 모델 경계

- `WorkbookTemplate`은 보호자가 직접 입력하는 문제집 카탈로그다.
- `WorkbookTemplateStage`는 같은 문제집의 모든 단원에 공통으로 적용되는 단계 구조다.
- `StudentWorkbook`은 특정 학생에게 배정된 문제집 인스턴스다.
- `StudentWorkbookProgress`는 `studentWorkbookId + curriculumNodeId + workbookTemplateStageId` 조합의 현재 상태만 저장한다.
- matrix는 전체 row를 미리 생성하지 않는다.
  - 저장된 레코드가 없으면 런타임에 `not_started`로 해석한다.
- 문제집 템플릿은 배정 이후에도 제목/출판사/활성 상태만 수정 가능하다.
  - 단계 구조 변경은 v1에서 허용하지 않는다.

## 7. 분류 정책

학습 맥락:

- 학교급: 학생 프로필 기준
- 학년: 학생 학교급 안에서 선택
- 학기: 학생이 `1/2` 중 선택
- 단원: `curriculum_nodes`에서 학생 학교급 + 선택 학년/학기 + 수학 과목 범위 안의 노드만 허용

오류유형:

- `calculation_mistake`
- `misread_question`
- `lack_of_concept`

현재 정책은 단일 선택 enum 고정이다.

## 8. 통계/대시보드 규칙

대시보드는 `wrong_notes.deleted_at is null` 데이터만 사용한다.

학생/보호자 공통 KPI:

- 총 오답 수
- 최근 30일 오답 수
- 피드백 완료 오답 수
- 오류유형별 건수 3종

추가 분포:

- 선택 학년/학기 기준 단원별 오답 현황 바 차트
  - 전체 `curriculum_nodes`를 기준으로 0건 단원까지 포함
- 선택 학년/학기 기준 오류유형별 오답 현황 바 차트
  - 3개 오류유형 고정 순서 유지

호환용 분포:

- `topUnits` 상위 5개 단원 분포는 dashboard response에 남아 있으나, 현재 기본 UI surface는 chart endpoint를 사용한다.

리스트 규칙:

- 기본 정렬: `created_at DESC`
- 필터: `grade`, `semester`, `curriculumNodeId`, `reason`, `from`, `to`, `hasFeedback`
- 기본 페이지 크기: 12
- 최대 페이지 크기: 50

Workbook progress 대시보드 규칙:

- 선택 문제집의 `학년 + 학기`에 해당하는 전체 `curriculum_nodes`와 전체 `workbook_template_stages`를 기준으로 matrix를 만든다.
- 저장 row가 없으면 해당 셀은 `not_started`로 렌더링한다.
- KPI:
  - 전체 단계 수
  - 완료 수
  - 진행중 수
  - 시작전 수
  - 완료율
- workbook bar chart:
  - 단원별 완료 단계 수
  - value = 해당 단원에서 `completed` 상태인 단계 수
  - total = 해당 단원의 전체 단계 수
- 상태 업데이트는 student/guardian 모두 가능하며, 마지막 변경 사용자와 `lastUpdatedAt`을 남긴다.

## 9. 인증/권한 경계

- 학생 API는 `Student.loginUserId = session.userId` 체인을 강제한다.
- 보호자 API는 `Student.guardianUserId = session.userId` 체인을 강제한다.
- 학생은 생성/조회/수정/삭제 가능
- 보호자는 조회/피드백 저장만 가능
- 보호자만 workbook template 생성/수정/배정 가능
- 학생과 보호자 모두 workbook progress 상태 수정 가능
- 학생은 다른 학생 `wrongNoteId`에 접근할 수 없다.
- 보호자는 자기 학생이 아닌 `studentId`로 접근할 수 없다.
- 학생은 자기에게 배정된 workbook만 wrong-note 연결과 progress 수정에 사용할 수 있다.
- 보호자는 자기 학생에게 배정된 workbook만 progress 수정에 사용할 수 있다.

## 10. 업로드 아키텍처

- 운영 저장 루트: `~/Library/Application Support/study-project/wrong-notes`
- 테스트 저장 루트: `apps/web/.tmp/test-data/wrong-notes`
- 저장 key: `{studentId}/{wrongNoteId}/{timestamp}-{uuid}.{ext}`
- DB `wrong_notes.image_path`는 공개 URL이 아니라 storage key를 저장한다.
- 브라우저 응답 `imagePath`는 아래 guarded image API URL로 직렬화한다.
  - 학생: `GET /api/v1/student/wrong-notes/{id}/image`
  - 보호자: `GET /api/v1/wrong-notes/{id}/image?studentId=...`
- 레거시 `/uploads/wrong-notes/...` 값은 read-only 호환으로만 지원한다.
- 허용 MIME: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
- 업로드 전 검증
  - MIME 확인
  - 최대 용량 확인
  - 파일 시그니처 확인
- 파일 누락 시 이미지 API는 `404`를 반환하고 UI는 재업로드/누락 placeholder를 표시한다.

## 11. 배포 토폴로지

- `web`: Next.js
- `db`: PostgreSQL
- `wrong-note-storage-root`: `~/Library/Application Support/study-project/wrong-notes`
- `wrong-note-backup-root`: `~/Library/Application Support/study-project-backups`
- 운영 형태: Mac mini 로컬/사설 베타

## 12. 확장 포인트

- OCR 파이프라인 추가
- 자동 피드백 추천
- 반복 오답 기반 재도전 관리
- workbook stage edit history / activity log
- workbook template import/export
- PDF/주간 리포트
- 과목 확장
