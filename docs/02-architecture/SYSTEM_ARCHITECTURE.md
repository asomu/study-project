# System Architecture

## 1. 아키텍처 스타일

- 모듈형 모놀리식 + 명확한 경계
- 초기 복잡도 최소화, 확장 시 worker 분리

## 2. 논리 모듈

- Auth/Family: 보호자-학생 계정/권한
- Curriculum: 학교급/학년/학기/단원 구조
- Assessment: 문제집/학습지/정오답 기록
- MistakeNote: 오답 이미지/분류/메모
- Analytics: 성취도/약점 분석
- Dashboard: 시각화 및 리포트

## 3. 데이터 모델(초안)

- users
- students
- curriculum_nodes
- materials
- attempts
- attempt_items
- wrong_answers
- wrong_answer_categories
- mastery_snapshots

## 4. 핵심 엔티티 관계

- `students` 1:N `attempts`
- `attempts` 1:N `attempt_items`
- `attempt_items` 0..1:N `wrong_answers`
- `wrong_answers` N:M `wrong_answer_categories`
- `curriculum_nodes`는 학교급/과목/학년/학기/단원 트리

## 5. 오답 카테고리 정책

MVP 기본 카테고리:

- calculation_mistake (단순 연산 실수)
- misread_question (문제 잘못 읽음)
- lack_of_concept (문제 이해 못함)

복수 선택 허용, 추후 사용자 정의 카테고리 확장.

## 6. 성취도 산식 (초안)

`mastery_score = 0.6 * recent_accuracy + 0.25 * consistency + 0.15 * difficulty_weight`

- recent_accuracy: 최근 4주 정답률
- consistency: 반복 시도 안정성
- difficulty_weight: 문항 난이도 가중치

## 7. 배포 토폴로지 (로컬)

- `web` (Next.js)
- `db` (PostgreSQL)
- `cache` (Redis)
- `storage` (MinIO)
- `proxy` (Caddy)

## 8. 외부 호스팅 전환 가이드

- DB 백업/복구 스크립트 표준화
- 스토리지 버킷 마이그레이션 자동화
- 환경변수 파일 분리(`.env.local`, `.env.prod`)
