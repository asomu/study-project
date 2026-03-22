# Data Model v1.3

- Version: v1.4
- Date: 2026-03-22
- Scope: Wrong-note-first + workbook-progress service

## 1. 모델 원칙

- 현재 제품의 오답 데이터 소스 오브 트루스는 `WrongNote`다.
- 현재 제품의 문제집 진도 데이터 소스 오브 트루스는 `WorkbookTemplate / StudentWorkbook / StudentWorkbookProgress`다.
- 오답 1건은 학생이 직접 올린 사진 1장과 분류 정보 1세트로 표현한다.
- 문제집 진도는 `단원 x 단계` 조합의 현재 상태만 저장한다.
- 단원 분류는 `curriculum_nodes`를 참조하고, 오류유형은 enum으로 고정한다.
- 삭제는 soft delete로 처리해 통계와 목록에서 기본 제외한다.
- 기존 `wrong_answers`는 레거시 데이터 모델로 남아 있지만 신규 대시보드와 API의 기준은 아니다.

## 2. 주요 테이블

### users

- id (uuid, pk)
- role (`guardian | student | admin`)
- login_id (unique)
- email (nullable, unique)
- name
- is_active
- password_hash
- accepted_terms_at, last_login_at
- created_at, updated_at

### user_credential_identifiers

- value (pk)
- user_id (fk -> users.id)
- created_at

역할:

- `email`과 `loginId`를 같은 레지스트리에서 조회해 전역 unique를 보장한다.

### students

- id (uuid, pk)
- guardian_user_id (fk -> users.id)
- login_user_id (nullable, unique, fk -> users.id)
- name
- school_level
- grade
- created_at, updated_at

### student_invites

- id (uuid, pk)
- student_id (fk -> students.id)
- code_hash (unique)
- expires_at
- used_at (nullable)
- created_by_guardian_user_id (fk -> users.id)
- created_at

### curriculum_nodes

- id (uuid, pk)
- curriculum_version
- school_level
- subject
- grade
- semester
- unit_code
- unit_name
- parent_id (nullable, self fk)
- sort_order
- active_from, active_to

### wrong_notes

- id (uuid, pk)
- student_id (fk -> students.id)
- curriculum_node_id (fk -> curriculum_nodes.id)
- reason (`calculation_mistake | misread_question | lack_of_concept`)
- image_path
- student_memo (nullable)
- guardian_feedback (nullable)
- guardian_feedback_by_user_id (nullable, fk -> users.id)
- guardian_feedback_at (nullable)
- student_workbook_id (nullable, fk -> student_workbooks.id)
- workbook_template_stage_id (nullable, fk -> workbook_template_stages.id)
- created_at
- updated_at
- deleted_at (nullable)

역할:

- 학생이 직접 업로드한 오답노트 1건을 표현한다.
- 보호자 피드백과 학생 메모를 같은 엔티티 안에서 함께 관리한다.
- `image_path`는 파일 바이너리나 공개 정적 URL이 아니라 repo 밖 저장소의 상대 storage key를 저장한다.
- 문제집 기반 학습에서 나온 오답이면 `student_workbook_id`와 `workbook_template_stage_id`를 함께 저장한다.

조회 규칙:

- 기본 조회와 통계는 `deleted_at is null`만 포함한다.
- API 응답 `imagePath`는 guarded image API URL로 직렬화한다.
- 레거시 `/uploads/wrong-notes/...` 값은 조회 시 한 번 더 호환 해석한다.

### workbook_templates

- id (uuid, pk)
- guardian_user_id (fk -> users.id)
- title
- publisher
- school_level
- grade
- semester
- is_active
- created_at
- updated_at

역할:

- 보호자가 직접 입력하는 문제집 템플릿이다.
- 같은 보호자 계정 안에서 여러 학생에게 재사용할 수 있다.
- v1에서는 `학년 + 학기` 단위로 고정한다.

### workbook_template_stages

- id (uuid, pk)
- workbook_template_id (fk -> workbook_templates.id)
- name
- sort_order
- created_at
- updated_at

역할:

- 문제집의 공통 단계 구조를 표현한다.
- 예: `개념원리 이해`, `핵심문제 익히기`, `중단원 마무리하기`, `서술형 대비문제`
- 같은 템플릿의 모든 단원에 공통 적용한다.

### student_workbooks

- id (uuid, pk)
- student_id (fk -> students.id)
- workbook_template_id (fk -> workbook_templates.id)
- is_archived
- created_at
- updated_at

역할:

- 특정 학생에게 배정된 문제집 인스턴스다.
- 한 학생은 여러 문제집을 동시에 가질 수 있다.
- 같은 학생에게 같은 템플릿을 중복 배정하지 않는다.

### student_workbook_progresses

- id (uuid, pk)
- student_workbook_id (fk -> student_workbooks.id)
- curriculum_node_id (fk -> curriculum_nodes.id)
- workbook_template_stage_id (fk -> workbook_template_stages.id)
- status (`not_started | in_progress | completed`)
- updated_by_user_id (fk -> users.id)
- last_updated_at
- created_at
- updated_at

unique:

- `student_workbook_id + curriculum_node_id + workbook_template_stage_id`

역할:

- 학생/보호자가 마지막으로 선택한 현재 상태를 저장한다.
- 전체 matrix row를 미리 생성하지 않고, 조회 시 없는 조합은 `not_started`로 해석한다.

## 3. 분류 규칙

### 오류유형 enum

- `calculation_mistake` / 단순 연산 실수
- `misread_question` / 문제 잘못 읽음
- `lack_of_concept` / 문제 이해 못함

현재는 단일 선택만 허용한다.

### 문제집 진도 상태 enum

- `not_started` / 시작전
- `in_progress` / 진행중
- `completed` / 완료

### 단원 분류

- `wrong_notes.curriculum_node_id`로 저장한다.
- 생성/수정 시 아래 조건을 만족해야 한다.
  - 학생의 `school_level`과 일치
  - 학생 학교급 안에서 선택 가능한 `grade`와 일치
  - `subject = math`
  - 선택한 `semester`와 일치
  - 현재 날짜 기준 활성 커리큘럼 노드

주의:

- 학생 프로필의 현재 학년과 오답노트의 대상 학년은 다를 수 있다.
- 오답노트의 대상 학년은 별도 컬럼으로 저장하지 않고 `curriculum_nodes.grade`에서 파생한다.
- 문제집 진도도 같은 방식으로 `curriculum_nodes.grade/semester`에서 학년/학기를 파생한다.

## 4. 문제집 연결 규칙

- 오답노트의 `student_workbook_id`와 `workbook_template_stage_id`는 둘 다 null이거나 둘 다 값이 있어야 한다.
- 오답노트에 문제집을 연결할 때:
  - 선택 문제집은 해당 학생에게 배정된 active workbook이어야 한다.
  - 선택 단계는 해당 문제집 템플릿에 속해야 한다.
  - 문제집 템플릿의 `grade/semester`와 오답노트 단원의 `grade/semester`가 일치해야 한다.
- 문제집 템플릿은 배정 이후에도 단계 구조를 변경하지 않는다.

## 5. 학생/보호자 뷰에서 필요한 파생 필드

학생/보호자 공통 응답은 아래 구조로 직렬화한다.

- `curriculum`
  - `grade`
  - `semester`
  - `curriculumNodeId`
  - `unitName`
- `reason`
  - `key`
  - `labelKo`
- `feedback`
  - `text`
  - `updatedAt`
  - `guardianUserId`
- `workbook`
  - `studentWorkbookId`
  - `templateId`
  - `title`
  - `publisher`
  - `stageId`
  - `stageName`

Workbook progress 대시보드 응답은 아래 구조를 포함한다.

- `availableWorkbooks[]`
- `selectedWorkbook`
  - `studentWorkbookId`
  - `templateId`
  - `title`
  - `publisher`
  - `grade`
  - `semester`
  - `stages[]`
- `summary`
  - `totalSteps`
  - `notStartedCount`
  - `inProgressCount`
  - `completedCount`
  - `completedPct`
- `unitBars[]`
  - `curriculumNodeId`
  - `unitName`
  - `completedSteps`
  - `totalSteps`
- `units[]`
  - `curriculumNodeId`
  - `unitName`
  - `stageStates[]`

## 6. 통계 파생 규칙

### 대시보드 요약

- `totalNotes`: 현재 살아 있는 전체 오답 수
- `recent30DaysNotes`: 최근 30일 생성 건수
- `feedbackCompletedNotes`: `guardian_feedback_at is not null` 건수
- `reasonCounts`: 이유별 그룹 카운트

### 바 차트 파생 규칙

단원별 오답 현황:

- 선택한 `grade + semester`의 `curriculum_nodes` 전체를 기준으로 막대를 만든다.
- 해당 학년/학기 오답이 없는 단원도 `0건` 막대로 포함한다.
- 정렬은 `sort_order ASC`, tie-break는 `unit_code ASC`다.

오류유형별 오답 현황:

- 선택한 `grade + semester`의 `wrong_notes`만 집계한다.
- 막대는 아래 3개 고정 순서를 유지한다.
  - `calculation_mistake`
  - `misread_question`
  - `lack_of_concept`

호환용 대시보드 분포:

- `topUnits`는 누적 오답 기준 상위 5개 단원을 반환하는 additive field다.
- 현재 기본 UI 분포 시각화는 전용 chart endpoint를 사용한다.

### 문제집 진도 파생 규칙

- 선택 문제집의 전체 단원 수 x 전체 단계 수 = `totalSteps`
- `completedCount`, `inProgressCount`, `notStartedCount`는 matrix 셀 상태 합계다.
- `completedPct = completedCount / totalSteps * 100`을 반올림한 값이다.
- `unitBars.completedSteps`는 각 단원에서 `completed` 상태인 단계 수다.
- `units[].stageStates[].lastUpdatedAt`은 저장된 row가 없으면 `null`이다.

## 7. 레거시 테이블 상태

아래 테이블은 코드베이스에 남아 있지만 현재 WrongNote 전용 대시보드의 기준은 아니다.

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
