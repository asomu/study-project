# Data Model v1 (Draft)

- Version: v1.0-draft
- Date: 2026-02-20

## 1. 모델 원칙

- school_level/subject 축을 모든 학습 엔티티에 반영
- 오답은 `문항 시도 결과`에 종속
- 카테고리는 N:M 구조로 다중 분류 지원

## 2. 주요 테이블

### users

- id (uuid, pk)
- role (guardian, admin)
- email (unique)
- password_hash
- created_at, updated_at

### students

- id (uuid, pk)
- guardian_user_id (fk -> users.id)
- name
- school_level (elementary, middle, high)
- grade (1..12)
- created_at, updated_at

### curriculum_nodes

- id (uuid, pk)
- curriculum_version (ex: 2022.12, 2026.01)
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
- created_at

### attempts

- id (uuid, pk)
- student_id (fk)
- material_id (fk)
- attempt_date
- notes
- created_at

### attempt_items

- id (uuid, pk)
- attempt_id (fk)
- curriculum_node_id (fk)
- problem_no
- is_correct (bool)
- difficulty (1..5, nullable)
- created_at

### wrong_answers

- id (uuid, pk)
- attempt_item_id (fk, unique)
- image_path
- memo
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

### mastery_snapshots

- id (uuid, pk)
- student_id (fk)
- curriculum_node_id (fk)
- score (0..100)
- accuracy (0..1)
- period_start, period_end
- created_at

## 3. 인덱스 제안

- attempts(student_id, attempt_date)
- attempt_items(attempt_id, curriculum_node_id)
- mastery_snapshots(student_id, curriculum_node_id, period_end)
- wrong_answers(created_at)

## 4. 확장 포인트

- category 커스텀 지원: wrong_answer_categories.owner_student_id (nullable)
- subject 확장: 과학/영어 추가 시 curriculum_nodes 동일 구조 사용
- 다자녀 가정: guardian 1:N students 이미 대응

## 5. 권한/무결성 규칙

- MVP에서는 `students.guardian_user_id`가 단일 소유권 기준이다.
- `materials.student_id`, `attempts.student_id`, `mastery_snapshots.student_id`는 모두 같은 보호자 소유 학생으로 연결되어야 한다.
- 서버는 조회/수정 시 학생 소유권 체인을 항상 검증해야 한다.
- 학생 독립 로그인은 MVP 범위 밖이며, 추후 별도 사용자 맵핑 테이블로 확장한다.
