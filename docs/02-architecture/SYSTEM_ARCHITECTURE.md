# System Architecture

- Date: 2026-03-21
- Scope: Wrong-note-first private beta

## 1. 아키텍처 스타일

- 모듈형 모놀리식
- Next.js App Router + Prisma + PostgreSQL
- 이미지 저장은 로컬 파일시스템
- 오답노트 대시보드가 학생/보호자 기본 진입 경험

## 2. 논리 모듈

- Auth/Family
  - 보호자 가입
  - 학생 초대/활성화
  - 역할별 보호 라우팅
- Curriculum
  - 학교급/학년/학기/단원 조회
  - 학생 학년/학기 기준 단원 유효성 검증
- WrongNote
  - `WrongNote` CRUD
  - 이미지 업로드/교체
  - 보호자 피드백
  - soft delete
- Dashboard
  - `WrongNote` 기반 KPI
  - 오류유형 분포
  - 상위 단원 분포
  - 필터 기반 카드 탐색
- Legacy Assessment/Study
  - 과거 `Attempt`, `WrongAnswer`, `Study` 흐름은 코드베이스에 남아 있으나 현재 기본 제품 경험과 통계 소스 오브 트루스는 아니다.

## 3. 현재 핵심 데이터 저장소

- `users`
- `user_credential_identifiers`
- `students`
- `student_invites`
- `curriculum_nodes`
- `wrong_notes`

레거시 저장소:

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

## 5. WrongNote 모델 경계

- `WrongNote`는 현재 제품의 오답 소스 오브 트루스다.
- `WrongNote`는 `Attempt`나 `WrongAnswer`에 의존하지 않는다.
- 학생이 사진 1장과 분류 정보로 직접 1건을 생성한다.
- 보호자 피드백은 같은 엔티티에 직접 기록한다.
- 삭제는 hard delete가 아니라 `deleted_at` soft delete다.

## 6. 분류 정책

학습 맥락:

- 학교급/학년: 학생 프로필 기준
- 학기: 학생이 `1/2` 중 선택
- 단원: `curriculum_nodes`에서 학생 학년/학기/수학 과목 범위 안의 노드만 허용

오류유형:

- `calculation_mistake`
- `misread_question`
- `lack_of_concept`

현재 정책은 단일 선택 enum 고정이다.

## 7. 통계/대시보드 규칙

대시보드는 `wrong_notes.deleted_at is null` 데이터만 사용한다.

학생/보호자 공통 KPI:

- 총 오답 수
- 최근 30일 오답 수
- 피드백 완료 오답 수
- 오류유형별 건수 3종

추가 분포:

- 상위 5개 단원 분포

리스트 규칙:

- 기본 정렬: `created_at DESC`
- 필터: `semester`, `curriculumNodeId`, `reason`, `from`, `to`, `hasFeedback`
- 기본 페이지 크기: 12
- 최대 페이지 크기: 50

## 8. 인증/권한 경계

- 학생 API는 `Student.loginUserId = session.userId` 체인을 강제한다.
- 보호자 API는 `Student.guardianUserId = session.userId` 체인을 강제한다.
- 학생은 생성/조회/수정/삭제 가능
- 보호자는 조회/피드백 저장만 가능
- 학생은 다른 학생 `wrongNoteId`에 접근할 수 없다.
- 보호자는 자기 학생이 아닌 `studentId`로 접근할 수 없다.

## 9. 업로드 아키텍처

- 저장 위치: `public/uploads/wrong-notes`
- 저장 파일명: `wrongNoteId + 확장자`
- 허용 MIME: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
- 업로드 전 검증
  - MIME 확인
  - 최대 용량 확인
  - 파일 시그니처 확인

## 10. 배포 토폴로지

- `web`: Next.js
- `db`: PostgreSQL
- `wrong-note-upload-dir`: 로컬 파일시스템
- 운영 형태: Mac mini 로컬/사설 베타

## 11. 확장 포인트

- OCR 파이프라인 추가
- 자동 피드백 추천
- 반복 오답 기반 재도전 관리
- PDF/주간 리포트
- 과목 확장
