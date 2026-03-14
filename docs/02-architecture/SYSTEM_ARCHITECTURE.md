# System Architecture

## 1. 아키텍처 스타일

- 모듈형 모놀리식 + 명확한 경계
- 초기 복잡도 최소화, 확장 필요가 증명되면 worker 분리

## 2. 논리 모듈

- Auth/Family: 보호자-학생 계정/권한
- Auth/Family는 보호자 직접 가입, 학생 초대코드 활성화, 역할별 라우팅을 포함
- Curriculum: 학교급/학년/학기/단원 구조
- Assessment: 문제집/학습지/정오답 기록 + 학습 세션 실행 기록 저장소
- MistakeNote: 오답 이미지/분류/메모
- Study: 내장 문제세트, 개념 자료, 학생 학습 세션, 보호자 리뷰 큐, 단원 상태 관리, guardian/admin authoring
- Analytics: 성취도/약점 분석
- Dashboard: 시각화 및 기간 필터 기반 추이 조회
- M5 Deferred: 리포트 산출물/추천 메시지

## 3. 데이터 모델(현재)

- users
- user_credential_identifiers
- students
- student_invites
- curriculum_nodes
- materials
- attempts
- attempt_items
- wrong_answers
- wrong_answer_categories
- practice_sets
- practice_problems
- concept_lessons
- study_work_artifacts
- study_reviews
- student_unit_progress
- mastery_snapshots

## 4. 핵심 엔티티 관계

- `users(guardian)` 1:N `students`
- `users` 1:N `user_credential_identifiers`
- `students` 0..1:1 `users(student login)`
- `students` 1:N `student_invites`
- `students` 1:N `attempts`
- `students` 1:N `study_reviews`
- `students` 1:N `student_unit_progress`
- `attempts` 1:N `attempt_items`
- `attempts` 0..1:1 `study_work_artifacts`
- `attempts` 0..1:1 `study_reviews`
- `attempt_items` 0..1:N `wrong_answers`
- `wrong_answers` N:M `wrong_answer_categories`
- `curriculum_nodes` 1:N `practice_sets`
- `practice_sets` 1:N `practice_problems`
- `curriculum_nodes` 0..1:1 `concept_lessons`
- `curriculum_nodes`는 학교급/과목/학년/학기/단원 트리

계정 식별 정책:

- 로그인 식별자(`email`, `loginId`)는 `user_credential_identifiers.value`로 정규화되어 전역 unique를 보장한다.
- 학생 계정 재설정 시 `Student.loginUserId` 연결을 해제하고, 기존 로그인 식별자 매핑을 제거한 뒤 새 초대코드를 발급한다.

## 5. 오답 카테고리 정책

MVP 기본 카테고리:

- calculation_mistake (단순 연산 실수)
- misread_question (문제 잘못 읽음)
- lack_of_concept (문제 이해 못함)

복수 선택 허용, 추후 사용자 정의 카테고리 확장.

## 5.1 Study Loop Boundary

- 학생 학습 루프는 `Study` 모듈이 orchestration을 담당하고, 실제 시도 결과 저장은 기존 `Attempt`/`AttemptItem`을 재사용한다.
- 내장 문제세트 시작 시 `Material.sourceType=system` + `systemKey=practice:{studentId}:{practiceSetId}` 규칙으로 숨김 `Material`을 지연 생성해 `Attempt.materialId`를 nullable로 바꾸지 않는다.
- 학생 연습에서 틀린 문항도 기존 `WrongAnswer` 파이프라인으로 들어가므로, manual record와 practice record가 같은 복습/분류 UX를 공유한다.
- 필기 캔버스는 v1에서 `StudyWorkArtifact.imagePath` 1장만 저장하고, stroke replay는 defer 한다.
- guardian/admin authoring은 별도 write API를 두되 같은 `Study` 모듈 안에서 `PracticeSet`/`ConceptLesson`을 관리한다.
- used `PracticeSet`은 attempt 발생 이후 구조적으로 immutable 취급하며, 메타데이터와 `isActive`만 수정할 수 있다.

## 6. 성취도 산식 (초안)

`mastery_score = 0.6 * recent_accuracy + 0.25 * consistency + 0.15 * difficulty_weight`

- recent_accuracy: 최근 4주 정답률
- consistency: 반복 시도 안정성
- difficulty_weight: 문항 난이도 가중치

## 7. 배포 토폴로지 (현재 로컬 운영)

- `web` (Next.js)
- `db` (PostgreSQL)
- `upload-dir` (로컬 파일시스템)
- `backup-dir` (로컬 백업 경로)
- 운영 형태: Mac mini 비공개 베타 + 내부 LAN 우선

## 8. Deferred Infra Candidates

- `proxy` (Caddy) + TLS
- `storage` (MinIO or S3-compatible)
- `cache/queue` (Redis + BullMQ)
- `worker`
- OpenTelemetry/Loki/Grafana

도입 조건:

- 외부 공개 또는 운영 자동화가 실제 요구로 확정될 때
- 업로드/집계/리포트 처리 비용이 현재 구조에서 병목으로 확인될 때

## 9. 외부 호스팅 전환 가이드

- DB 백업/복구 스크립트 표준화
- 스토리지 버킷 마이그레이션 자동화
- 환경변수 파일 분리(`.env.local`, `.env.prod`)

## 10. 커리큘럼 버전 선택 규칙

- 커리큘럼 조회는 `asOfDate` 기준으로 유효 버전을 선택한다.
- 버전 충돌 시 명시적 `curriculumVersion` 파라미터가 우선한다.
- 응답에 적용 버전 메타를 포함해 대시보드 계산과 추적성을 보장한다.

## 11. 공식 데이터 소스 정책

- NCIC 수집은 `inventoryNodeList.do`, `invFileList.do`, `inv/org/download.do` 경로를 기준으로 한다.
- `bbs/standard/view/*` 상세 페이지는 404 리스크가 있어 MVP 자동수집 경로에서 제외한다.
- 데이터 소스 변경은 Decision Log에 기록 후 반영한다.

## 12. Reserved but Deferred

- `mastery_snapshots` 테이블은 스키마에 존재하지만 현재 조회 경로에서는 사용하지 않는다.
- 배치 캐시 계층과 추천 규칙은 M5 이후 실제 병목/요구를 기준으로 도입한다.
