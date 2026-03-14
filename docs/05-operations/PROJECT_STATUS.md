# Project Status

- Last Updated: 2026-03-14
- Current Phase: M7 Study Content Authoring Verified
- Overall Progress: 100%

## 1. Milestone Status

| Milestone | Status | Progress | Owner | Notes |
| --- | --- | --- | --- | --- |
| M0 설계/문서화 | COMPLETED | 100% | Team | 권한/버전/데이터소스/운영정책 리스크 반영 완료 |
| M1 기반 구축 | COMPLETED | 100% | Team | Docker DB 런타임 검증 + 인증/학생 API/UI/테스트 게이트 완료 |
| M2 핵심 입력 기능 | COMPLETED | 100% | Team | 입력 API 8종 + 최소 UI 2화면 + 업로드/권한/테스트 게이트 완료 |
| M3 대시보드 MVP | COMPLETED | 100% | Team | overview/weakness/trends API + 대시보드 실사용 UI + 테스트 게이트 완료 |
| M4 검증/안정화 | COMPLETED | 100% | Team | Wave 1~3 회귀 강화 + 운영 체크리스트/게이트 고정 완료 |
| M5 리포트/추천 확장 | DEFERRED | 0% | Team | 리포트 산출물/추천 API는 M6 이후 별도 단계로 유지 |
| M6 학생 학습 루프 확장 | COMPLETED | 100% | Team | study 모듈, 학생 학습 화면, 보호자 리뷰 큐, 진도 상태 관리, 테스트/문서 동기화 완료 |
| M7 학습 콘텐츠 Authoring UI | COMPLETED | 100% | Team | `/study/content`, authoring API, used set structural lock, 학생 보드 즉시 반영, 테스트/문서 동기화 완료 |

## 2. Current Sprint Focus

- [x] PRD/아키텍처/스택/개발 프로세스/테스트 전략 문서화
- [x] JWT + 학생/보호자 계정 모델 + 역할 기반 page/API guard 구현
- [x] M2 입력 API/오답 이미지 업로드/보호자 관리 UI 구현
- [x] M3 대시보드 API/집계 모듈/UI 및 회귀 테스트 게이트 구현
- [x] M4 회귀 강화 Wave 1~3 + 운영 체크리스트/PR/릴리즈 게이트 고정
- [x] 실사용 전환 코어: 보호자 signup, 학생 activation, 학생 관리, 역할 분리 대시보드 구현
- [x] 식별자 전역 유니크 레지스트리 + 학생 reset/reinvite 운영 플로우 구현
- [x] M6 스키마 확장
  - `PracticeSet`, `PracticeProblem`, `ConceptLesson`, `StudyWorkArtifact`, `StudyReview`, `StudentUnitProgress`
  - 기존 `Material`, `Attempt`, `AttemptItem` 최소 확장
- [x] M6 Study 모듈 구현
  - current semester 계산
  - daily mission 선택
  - 자동채점
  - progress 상태 전이
  - PNG 캔버스 저장
- [x] M6 학생 API 구현
  - `GET /api/v1/student/study/board`
  - `GET /api/v1/student/study/concepts/{curriculumNodeId}`
  - `GET /api/v1/student/study/sessions`
  - `POST /api/v1/student/study/sessions`
  - `POST /api/v1/student/study/sessions/{id}/submit`
  - `GET /api/v1/student/wrong-answers`
  - `PUT /api/v1/student/wrong-answers/{id}`
  - `POST /api/v1/student/wrong-answers/{id}/image`
- [x] M6 보호자 API 구현
  - `GET /api/v1/study/reviews`
  - `POST /api/v1/study/reviews/{sessionId}`
  - `GET /api/v1/study/progress`
  - `PUT /api/v1/study/progress/{curriculumNodeId}`
- [x] M6 학생/보호자 UI 구현
  - 학생 대시보드 런치패드
  - 학습 세션(타이머 + 캔버스)
  - 학생 오답노트 self-service
  - 학생 진도/개념 보드
  - 보호자 학습 리뷰 큐
- [x] M6 테스트 확장
  - unit: `study-service`
  - route-contract: study/student wrong-answer/progress 권한 및 상태 전이
  - real integration: 학생 제출 -> 오답 -> 보호자 리뷰 -> 진도 반영
  - e2e: 학생 학습 -> 보호자 리뷰 -> 학생 피드백 확인
- [x] closeout review 반영
  - student board / guardian progress / session start / concept 추천 / guardian progress update에서 현재 학기 경계 강제
  - `.next-playwright` distDir 분리 및 lint/typecheck/build ignore 정리
- [x] 문서 동기화
  - `PRD`, `DEVELOPMENT_PLAN`, `SYSTEM_ARCHITECTURE`, `DATA_MODEL`, `API_SPEC_V1`, `DECISION_LOG`, `PROJECT_STATUS`, `HANDOFF`, `CONTEXT_INDEX`
- [x] 학습 문서화
  - M6 기술 설명 노트 작성 및 인덱스 반영
- [x] M7 guardian/admin authoring 구현
  - `/study/content` 단일 운영 화면 + 상단 네비게이션 연결
  - `연습 세트` / `개념 자료` 탭
  - 학기 필터 기반 최신 커리큘럼 버전 조회
- [x] M7 authoring API 구현
  - `GET /api/v1/study/content`
  - `POST /api/v1/study/content/practice-sets`
  - `PUT /api/v1/study/content/practice-sets/{id}`
  - `PUT /api/v1/study/content/practice-sets/{id}/activation`
  - `PUT /api/v1/study/content/concepts/{curriculumNodeId}`
  - `DELETE /api/v1/study/content/concepts/{curriculumNodeId}`
- [x] M7 authoring 규칙 고정
  - used practice set 구조 수정 차단(`409`)
  - skillTags normalize/lowercase/dedupe
  - concept block type/steps/table validation
  - concept delete -> student progress/concept 즉시 반영
- [x] M7 테스트 확장
  - unit: `study-authoring`
  - route-contract: study content 권한/검증/used set lock
  - real integration: create/deactivate/delete, used set metadata update vs structural reject
  - e2e: guardian authoring -> student progress/session -> guardian lock 확인
- [x] M7 문서 동기화
  - `PRD`, `DEVELOPMENT_PLAN`, `API_SPEC_V1`, `SYSTEM_ARCHITECTURE`, `PROJECT_STATUS`, `HANDOFF`, `DECISION_LOG`, `CONTEXT_INDEX`

## 3. Risks and Blocks

- 기능 구현 블로커 없음
- 검증 블로커 없음
- 수동 QA 미완료: iPad/Pencil 필기 입력, 회전, 새로고침 복구, PNG 크기/로딩 시간은 아직 수동 검증이 필요하다.
- 보호자 대시보드 통합 범위: M6/M7 학습 데이터는 학생 보드와 보호자 리뷰/진도 화면에 반영되지만, 기존 보호자 분석 대시보드 통합 집계는 후속 단계다.
- authoring 후속 범위: draft/versioning/publish workflow, bulk import/export, 다과목 확장은 아직 없다.

## 4. Next Actions

1. iPad/Pencil 수동 QA를 실행하고 업로드 크기, 회전 대응, 새로고침 복구 결과를 체크리스트로 남긴다.
2. M6/M7 학습 데이터를 기존 보호자 분석 대시보드 집계에 통합할지 범위를 정리한다.
3. M5 deferred 범위(리포트 산출물, 추천 규칙, authoring draft/versioning)를 다시 우선순위화한다.

## 5. Change Log

- 2026-02-20: 계획 문서 세트 초기 생성
- 2026-02-20: DB 모델/API 명세 초안 추가
- 2026-02-20: NCIC 데이터 소스(JSON/PDF) 수집 및 프롬프트 템플릿 추가
- 2026-02-20: docs 카테고리 구조(01~07) 재편 및 문서 경로 갱신
- 2026-02-20: 문서 템플릿/링크검증 스크립트/AGENTS.md/specalist agents 추가
- 2026-02-21: M1 기반 구축 코드/테스트/문서 반영 및 DB 런타임 검증 완료
- 2026-02-21: M2 입력 API/보호 UI/소유권 체인/로컬 이미지 업로드 구현 완료
- 2026-02-21: M3 대시보드 API/집계 모듈/UI 구현 완료
- 2026-02-24: 세션 부트스트랩용 `CONTEXT_INDEX.md` 신설 및 M4 회귀 강화 Wave 1 완료
- 2026-02-27: M4 회귀 강화 Wave 2~3 완료 및 품질 게이트 재검증
- 2026-02-28: 운영 체크리스트/PR·릴리즈 게이트 문서 고정 및 M4 COMPLETED 전환
- 2026-03-01: `verify:pr` / `verify:release` 표준 실행 스크립트 정착
- 2026-03-07: private beta 실사용 코어(guardian signup, student activation, role split dashboard) 구현 완료
- 2026-03-07: `user_credential_identifiers` 기반 식별자 전역 유니크 및 학생 reset/reinvite 플로우 구현
- 2026-03-08: M6 학생 학습 루프 구현 완료
  - Prisma schema/migration/seed 확장
  - study module + 학생/보호자 API/화면 구현
  - 자동채점, daily mission, 보호자 리뷰 큐, 단원 상태형 진도표, 학생 오답노트 self-service 추가
- 2026-03-08: M6 품질 게이트 통과
  - `typecheck`, `lint`, `test:unit`, `test:route-contract`, `test:integration:real`, `test:e2e:mocked`, `test:e2e:real`, `build`
- 2026-03-08: closeout review에서 현재 학기 경계 누락 이슈를 수정하고 route-contract 재고정
- 2026-03-08: M6 문서/핸드오프/기술 설명 노트 동기화 완료
- 2026-03-14: M7 학습 콘텐츠 authoring UI 구현 완료
  - `/study/content` 화면 + guardian nav 연결
  - practice set/concept lesson authoring API 추가
  - used set structural lock, concept delete reflection, latest curriculum version 조회 규칙 고정
- 2026-03-14: M7 품질 게이트 통과
  - `typecheck`, `lint`, `test:unit`, `test:route-contract`, `test:integration:real`, `test:e2e:mocked`
- 2026-03-14: M7 문서/핸드오프 동기화 완료
- 2026-03-14: M7 closeout review에서 practice set activation route의 예외 분류를 수정
  - DB unexpected error를 `404`로 숨기지 않고, not-found만 명시적으로 `404` 처리하도록 정리
