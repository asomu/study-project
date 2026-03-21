# Data Model v1.2

- Version: v1.2
- Date: 2026-03-21
- Scope: Wrong-note-first service

## 1. 모델 원칙

- 현재 제품의 오답 데이터 소스 오브 트루스는 `WrongNote`다.
- 오답 1건은 학생이 직접 올린 사진 1장과 분류 정보 1세트로 표현한다.
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
- created_at
- updated_at
- deleted_at (nullable)

역할:

- 학생이 직접 업로드한 오답노트 1건을 표현한다.
- 보호자 피드백과 학생 메모를 같은 엔티티 안에서 함께 관리한다.

조회 규칙:

- 기본 조회와 통계는 `deleted_at is null`만 포함한다.

## 3. 분류 규칙

### 오류유형 enum

- `calculation_mistake` / 단순 연산 실수
- `misread_question` / 문제 잘못 읽음
- `lack_of_concept` / 문제 이해 못함

현재는 단일 선택만 허용한다.

### 단원 분류

- `wrong_notes.curriculum_node_id`로 저장한다.
- 생성/수정 시 아래 조건을 만족해야 한다.
  - 학생의 `school_level`과 일치
  - 학생의 `grade`와 일치
  - `subject = math`
  - 선택한 `semester`와 일치
  - 현재 날짜 기준 활성 커리큘럼 노드

## 4. 학생/보호자 뷰에서 필요한 파생 필드

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

## 5. 통계 파생 규칙

### 대시보드 요약

- `totalNotes`: 현재 살아 있는 전체 오답 수
- `recent30DaysNotes`: 최근 30일 생성 건수
- `feedbackCompletedNotes`: `guardian_feedback_at is not null` 건수
- `reasonCounts`: 이유별 그룹 카운트

### 상위 단원 분포

- `wrong_notes`를 단원별로 묶어 count 집계
- count 내림차순
- tie-break는 `unitName ASC`
- 최대 5개 반환

## 6. 레거시 테이블 상태

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
