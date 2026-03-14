# Data Model v1.1

- Version: v1.1
- Date: 2026-03-08
- Scope: M1-M6 implemented

## 1. 모델 원칙

- 계정/소유권 체인은 `guardian user -> student -> material/attempt/wrongAnswer/study data` 기준으로 일관되게 유지한다.
- manual record와 built-in practice를 서로 다른 저장소로 분리하지 않고, 공통 실행 기록은 `Attempt`/`AttemptItem`에 저장한다.
- 학생 학습 진도 상태는 분석용 `mastery_snapshots`와 분리된 운영 상태(`student_unit_progress`)로 관리한다.
- 학생 연습 오답도 기존 `wrong_answers` 파이프라인으로 통합해 복습 UX를 재사용한다.

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

- `email`과 `loginId`를 같은 레지스트리에서 조회해 교차 충돌을 DB 레벨 unique로 막는다.

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

### materials

- id (uuid, pk)
- student_id (fk)
- title
- publisher
- subject
- school_level
- grade
- semester
- source_type (`manual | system`)
- system_key (nullable, unique)
- created_at, updated_at

역할:

- 보호자가 직접 입력한 문제집은 `source_type=manual`
- 내장 문제세트 실행용 숨김 문제집은 `source_type=system`

### attempts

- id (uuid, pk)
- student_id (fk)
- material_id (fk)
- practice_set_id (nullable, fk -> practice_sets.id)
- attempt_date
- notes (nullable)
- source_type (`manual | practice`)
- started_at, submitted_at (nullable)
- elapsed_seconds (nullable)
- created_at, updated_at

역할:

- manual 입력 기록과 student practice 세션을 함께 저장한다.

### attempt_items

- id (uuid, pk)
- attempt_id (fk)
- curriculum_node_id (fk)
- practice_problem_id (nullable, fk -> practice_problems.id)
- problem_no
- is_correct
- difficulty (nullable)
- student_answer (nullable)
- created_at, updated_at

제약:

- `(attempt_id, problem_no)` unique

### wrong_answers

- id (uuid, pk)
- attempt_item_id (fk, unique)
- image_path (nullable)
- memo (nullable)
- reviewed_at (nullable)
- created_at

### wrong_answer_categories

- id (uuid, pk)
- key (unique)
- label_ko

Seed values:

- calculation_mistake / 단순 연산 실수
- misread_question / 문제 잘못 읽음
- lack_of_concept / 문제 이해 못함

### wrong_answer_category_map

- wrong_answer_id (fk)
- category_id (fk)
- primary key (wrong_answer_id, category_id)

### practice_sets

- id (uuid, pk)
- title
- description (nullable)
- school_level
- subject
- grade
- semester
- curriculum_node_id (fk)
- is_active
- sort_order
- created_at, updated_at

### practice_problems

- id (uuid, pk)
- practice_set_id (fk)
- curriculum_node_id (fk)
- problem_no
- type (`single_choice | short_answer`)
- prompt
- choices_json (nullable)
- correct_answer
- explanation (nullable)
- skill_tags (string[])
- difficulty
- created_at, updated_at

### concept_lessons

- id (uuid, pk)
- curriculum_node_id (unique, fk)
- title
- summary (nullable)
- content_json
- created_at, updated_at

### study_work_artifacts

- id (uuid, pk)
- attempt_id (unique, fk -> attempts.id)
- image_path
- created_at, updated_at

역할:

- v1에서는 세션당 PNG snapshot 1장만 저장한다.

### study_reviews

- id (uuid, pk)
- attempt_id (unique, fk -> attempts.id)
- student_id (fk -> students.id)
- guardian_user_id (fk -> users.id)
- feedback
- progress_status (`planned | in_progress | review_needed | completed`)
- reviewed_at
- created_at, updated_at

### student_unit_progress

- id (uuid, pk)
- student_id (fk -> students.id)
- curriculum_node_id (fk -> curriculum_nodes.id)
- status (`planned | in_progress | review_needed | completed`)
- note (nullable)
- last_studied_at (nullable)
- reviewed_at (nullable)
- updated_by_guardian_user_id (nullable, fk -> users.id)
- created_at, updated_at

제약:

- `(student_id, curriculum_node_id)` unique

### mastery_snapshots

- id (uuid, pk)
- student_id (fk)
- curriculum_node_id (fk)
- score (0..100)
- accuracy (0..1)
- period_start, period_end
- created_at

역할:

- M3 대시보드용 누적 분석 모델
- M6 단원 상태(`student_unit_progress`)와 목적이 다르므로 병행 유지

## 3. 핵심 관계

- `users(guardian)` 1:N `students`
- `users` 1:N `user_credential_identifiers`
- `students` 0..1:1 `users(student login)`
- `students` 1:N `student_invites`
- `students` 1:N `materials`
- `students` 1:N `attempts`
- `students` 1:N `study_reviews`
- `students` 1:N `student_unit_progress`
- `materials` 1:N `attempts`
- `practice_sets` 1:N `practice_problems`
- `practice_sets` 1:N `attempts`
- `attempts` 1:N `attempt_items`
- `attempts` 0..1:1 `study_work_artifacts`
- `attempts` 0..1:1 `study_reviews`
- `attempt_items` 0..1:1 `wrong_answers`
- `wrong_answers` N:M `wrong_answer_categories`
- `curriculum_nodes` 1:N `attempt_items`
- `curriculum_nodes` 1:N `practice_sets`
- `curriculum_nodes` 1:N `practice_problems`
- `curriculum_nodes` 0..1:1 `concept_lessons`
- `curriculum_nodes` 1:N `student_unit_progress`

## 4. 무결성 / 권한 규칙

- 보호자 전용 mutation은 항상 `guardian_user_id -> student_id` 소유권 체인을 검증한다.
- 학생 전용 mutation은 `Student.loginUserId == authenticated userId` 연결을 전제로 한다.
- 내장 문제세트 시작 시 `system_key = practice:{studentId}:{practiceSetId}` 기준으로 숨김 `Material`을 지연 생성/재사용한다.
- practice 세션 제출 시 오답 문항은 같은 트랜잭션에서 `WrongAnswer`를 자동 생성한다.
- `student_unit_progress` 상태 전이는 아래 규칙만 허용한다.
  - `planned -> in_progress | review_needed | completed`
  - `in_progress -> in_progress | review_needed | completed`
  - `review_needed -> in_progress | review_needed | completed`
  - `completed -> completed | review_needed`

## 5. v1 제한 / Deferred

- 필기 캔버스는 PNG snapshot만 저장하고 stroke replay는 저장하지 않는다.
- OCR/서술형 자동 판정은 현재 모델에 포함하지 않는다.
- 개념/문제 authoring UI는 seed 또는 코드 기반 생성만 지원한다.
