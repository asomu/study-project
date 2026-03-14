# Development Plan

- Plan Version: v1.0
- Start Baseline: 2026-02-20

## 1. Milestones

1. M0: 설계/문서화 완료
- 산출물: PRD, 아키텍처, 테스트/리뷰 전략, 상태관리 문서

2. M1: 기반 구축
- Next.js 프로젝트 초기화
- DB/Prisma/인증/기본 레이아웃

3. M2: 핵심 데이터 입력
- 문제집/학습지 입력
- 단원별 정오답 입력
- 오답 이미지 업로드 + 카테고리 분류

4. M3: 대시보드 MVP
- 진도 대비 성취도
- 단원별 약점 시각화
- 오답 유형 분포

5. M4: 검증/안정화
- 테스트 강화
- 로컬 배포 안정화
- 사용자 피드백 반영

6. M5: 리포트/추천 확장
- 리포트 산출물
- 약점 우선순위 추천
- 필요 시 배치/캐시 계층 도입 검토

7. M6: 학생 학습 루프 확장
- 내장 문제세트 + 자동채점
- 학생 진도/개념 보드
- 학생 오답노트 self-service
- 보호자 리뷰 큐 + 단원 상태 관리

8. M7: 학습 콘텐츠 Authoring UI
- `/study/content` 운영 화면
- 연습 세트 create/update/activation
- 개념 자료 create/update/delete
- 학생 보드/세션 즉시 반영

9. M8: 보호자 통합 Study Dashboard
- 기존 `/dashboard`에 M6/M7 학습 루프 데이터 통합
- 규칙 기반 다음 액션 + 리뷰 큐 미리보기 + 단원 상태 주의 목록
- `/study/reviews?studentId=` deep-link 흐름 고정

## 1.1 M1 Scope Lock (2026-02-20)

포함 범위:

- pnpm 워크스페이스 + Next.js 16(App Router) + Tailwind 4 + ESLint/Prettier
- PostgreSQL 대상 Prisma 스키마/마이그레이션/시드 파일
- 커스텀 JWT + HttpOnly 쿠키 기반 인증(`POST /api/v1/auth/login`, `POST /api/v1/auth/logout`)
- 학생 기본 API(`GET /api/v1/students`, `POST /api/v1/students`) + 소유권 가드 스캐폴딩
- 기본 로그인/대시보드 셸 화면과 보호 라우팅
- Unit/Integration/E2E smoke 테스트 게이트

비포함 범위:

- Redis/BullMQ, MinIO, Caddy 운영 구성
- 오답 이미지 업로드 API 및 대시보드 분석 API 구현
- M2 이후 도메인(문제집/시도/오답 입력) 기능 상세

## 1.2 M2 Scope Lock (2026-02-21)

포함 범위:

- 입력 API 구현
  - `GET /api/v1/curriculum`
  - `POST /api/v1/materials`
  - `POST /api/v1/attempts`
  - `POST /api/v1/attempts/{attemptId}/items`
  - `POST /api/v1/wrong-answers`
  - `GET /api/v1/wrong-answers`
  - `PUT /api/v1/wrong-answers/{id}/categories`
  - `POST /api/v1/wrong-answers/{id}/image`
- 소유권 체인 검증 확장(`material/attempt/attemptItem/wrongAnswer`)
- 최소 UI 2화면(`records/new`, `wrong-answers/manage`) + 보호 라우팅 연결
- 로컬 파일 업로드 정책 적용(`public/uploads/wrong-answers`, 최대 5MB, jpeg/png/webp)
- Hybrid TDD 게이트 확장(unit/integration/e2e smoke)

비포함 범위:

- Redis/MinIO/Caddy 운영 구성
- 대시보드 분석 API(`overview/weakness/trends`) 본 구현
- OCR/자동채점/다과목 확장

## 1.3 M3 Scope Lock (2026-02-21)

포함 범위:

- 대시보드 API 구현
  - `GET /api/v1/dashboard/overview`
  - `GET /api/v1/dashboard/weakness`
  - `GET /api/v1/dashboard/trends`
- `/dashboard` 단일 화면을 실사용 가능한 MVP 수준으로 개편
  - 필터(학생/기준일/기간), KPI 카드, 약점 리스트, 오답 유형 분포, 주간 추이 차트
  - 차트는 외부 라이브러리 없이 SVG/CSS로 구현
- 집계 데이터 소스는 `attempt_items` 직접 집계로 고정
- 트렌드는 최근 4주(28일) 주 단위(월요일 시작) 기준으로 제공
- 약점 랭킹은 `정답률 오름차순 + 최소 시도수 3회 + 상위 5개` 규칙 적용
- Hybrid TDD 확장
  - Unit(계산 규칙), Integration(API 계약/권한/검증), E2E(입력->대시보드 반영 + 학생 전환/빈상태)

비포함 범위:

- 대시보드 상세 분리 화면
- 차트 라이브러리 도입
- AI 추천/고급 분석 로직
- M2 오답 카테고리 UX 전면 개편

## 1.4 M4 Scope Lock (Wave 1, 2026-02-24)

포함 범위:

- 대시보드 회귀 고정 fixture 추가
  - `/Users/mark/Documents/project/study-project/apps/web/tests/fixtures/dashboard-fixtures.ts`
- Unit 회귀 강화
  - `dashboard-metrics` 계산 함수 경계 케이스(가중치 null, 일관성 표준편차, 카테고리 분포, 트렌드 버킷 경계)
- Integration 회귀 강화
  - `GET /api/v1/dashboard/weakness`, `GET /api/v1/dashboard/trends`의 `401/403/400` 실패 경로 확장
  - `weekly/monthly` 날짜 경계(`today-29`, `endOfDay`, 주간 버킷 경계) 검증
- 품질 게이트 재검증
  - `lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e`

비포함 범위:

- 런타임 기능/API/스키마 변경
- DB 마이그레이션 및 대규모 seed 확장
- M2 오답 카테고리 UX 개선 본 구현
- 운영 체크리스트(TLS/백업 정책) 문서 상세화

## 1.5 M4 Scope Lock (Wave 2, 2026-02-27)

포함 범위:

- 대시보드 회귀 fixture 확장(`overview/trends` 계산 경계 중심)
  - 기본 날짜(쿼리 생략), 학기 경계(2학기 시작), 활성 커리큘럼 0건
  - 부분 주간 버킷(mid-week range), `rangeEnd` 단독 입력 기본 범위
- Unit 회귀 강화
  - `calculateRecommendedPct` 2학기 시작값/학기 종료 이후 clamp 검증
- Integration 회귀 강화
  - `GET /api/v1/dashboard/overview`의 기본 날짜/학기 경계/빈 커리큘럼 처리 검증
  - `GET /api/v1/dashboard/trends`의 부분 버킷/`rangeEnd` 단독 기본범위 검증
- 품질 게이트 재검증
  - `lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e`, `check-doc-links.sh`

비포함 범위:

- 런타임 기능/API/스키마 변경
- DB 마이그레이션 및 seed 정책 변경
- M2 오답 카테고리 선택형 UI 구현
- 운영 보안/백업 체크리스트 상세 정책 문서화

## 1.6 M4 Scope Lock (Wave 3, 2026-02-27)

포함 범위:

- e2e 회귀 fixture 확장(`records -> wrong-answers -> dashboard` 데이터 반영 시나리오)
  - e2e 전용 fixture 모듈 추가(`tests/e2e/fixtures/dashboard-wave3-fixtures.ts`)
  - overview/weakness/trends 응답을 입력 상태 기반으로 동적 구성
- e2e 회귀 강화
  - 오답 카테고리 저장 결과가 대시보드 분포에 반영되는지 검증
  - 대시보드 필터(기준일/약점기간) 변경 시 쿼리 파라미터 반영 검증
  - trends range(`rangeStart=-27d`, `rangeEnd=asOfDate`) 경계 검증
- 품질 게이트 재검증
  - `lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e`, `check-doc-links.sh`

비포함 범위:

- 런타임 기능/API/스키마 변경
- DB 마이그레이션 및 seed 정책 변경
- M2 오답 카테고리 선택형 UI 구현
- 운영 보안/백업 체크리스트 상세 정책 문서화

## 1.7 M4 Closeout (2026-02-28)

포함 범위:

- M2 UX 백로그 마무리
  - `wrong-answers/manage` 카테고리 입력을 선택형 UI(checkbox)로 전환
  - 카테고리 선택 상태 유틸 모듈 분리(`category-selection`)
  - unit/integration/e2e 회귀 보강(저장/해제/조회/반영)
- lint 게이트 안정화
  - `test-results` 미존재 환경에서도 `pnpm lint`가 통과하도록 스크립트 보강
- 운영 체크리스트 확정
  - `/Users/mark/Documents/project/study-project/docs/05-operations/OPERATIONS_CHECKLIST.md` 신설
  - 백업/보관/정리 주기 및 알림 기준 문서화
- PR/릴리즈 회귀 게이트 확정
  - `TEST_AND_VALIDATION.md`에 M4 회귀 세트(대시보드 경계, 입력->대시보드 반영, 카테고리 저장/해제) 고정
  - PR 게이트: `lint`, `typecheck`, `test`, `check-doc-links.sh`
  - 릴리즈 게이트: PR 게이트 + `test:e2e`
- 상태 문서 동기화
  - `PROJECT_STATUS`, `CONTEXT_INDEX`, `HANDOFF`, `DECISION_LOG`, `INDEX`, `README` 반영

비포함 범위:

- 런타임 기능/API/스키마 변경
- DB 마이그레이션 및 seed 정책 변경
- 외부 배포 인프라(Caddy/MinIO/Redis) 본 적용

## 1.8 Release Hardening Alignment (2026-03-07)

포함 범위:

- 스택/아키텍처/구조 문서를 실제 구현 기준으로 정렬
- `AttemptItem(attemptId, problemNo)` DB 유니크 제약 추가
- 업로드 MIME + 파일 시그니처 검증 추가
- 구조화 로그(인증 실패/소유권 거부/업로드 실패) 추가
- real integration / real e2e smoke 테스트 추가
- GitHub Actions 품질/릴리즈 게이트 추가
- 수동 배포 절차를 운영 체크리스트에 명령 단위로 고정

비포함 범위:

- Redis/MinIO/Caddy/관측성 스택 도입
- 리포트 산출물/추천 메시지 구현
- 분산 아키텍처 전환

## 1.9 M5 Scope Direction (2026-03-07)

포함 범위 후보:

- 다운로드/공유 가능한 리포트 산출물
- 약점 우선순위 추천 규칙(`accuracy + recentness + repeat-error count`)
- 필요 시 `mastery_snapshots` 활용 여부 검토

비포함 범위:

- MVP 릴리즈 하드닝 게이트 재정의
- Redis/MinIO 도입을 위한 선행 인프라 작업

## 1.10 Private Beta Actual-use Expansion (2026-03-07)

포함 범위:

- `/` 랜딩 페이지 + 공용 로그인 흐름 정리
- 보호자 회원가입(`/signup`)
- 학생 초대코드 발급/학생 첫 활성화(`/student/activate`)
- 보호자 대시보드와 학생 대시보드 분리
- 학생 관리 화면(`/students/manage`)
- shared loginId 기반 계정 모델(`User.loginId`, `Student.loginUserId`, `StudentInvite`)
- 역할 기반 페이지/API 가드 강화

비포함 범위:

- 비밀번호 재설정, 이메일 인증, 다중 보호자 연결
- 추천 문제/문제은행/iPad 필기 입력
- 공개 인터넷 배포/TLS reverse proxy 본 적용

## 1.11 M6 Scope Lock (2026-03-08)

포함 범위:

- 신규 `Study` 모듈 추가 + 기존 `Assessment`를 실행 기록 저장소로 재사용
- Prisma 확장
  - `PracticeSet`, `PracticeProblem`, `ConceptLesson`, `StudyWorkArtifact`, `StudyReview`, `StudentUnitProgress`
  - `Material.sourceType`, `Attempt.sourceType|startedAt|submittedAt|elapsedSeconds|practiceSetId`, `AttemptItem.practiceProblemId|studentAnswer`
- 학생 API 구현
  - `GET /api/v1/student/study/board`
  - `GET /api/v1/student/study/concepts/{curriculumNodeId}`
  - `GET /api/v1/student/study/sessions`
  - `POST /api/v1/student/study/sessions`
  - `POST /api/v1/student/study/sessions/{id}/submit`
  - `GET /api/v1/student/wrong-answers`
  - `PUT /api/v1/student/wrong-answers/{id}`
  - `POST /api/v1/student/wrong-answers/{id}/image`
- 보호자 API 구현
  - `GET /api/v1/study/reviews`
  - `POST /api/v1/study/reviews/{sessionId}`
  - `GET /api/v1/study/progress`
  - `PUT /api/v1/study/progress/{curriculumNodeId}`
- 학생 UI 확장
  - `/student/dashboard` 학습 런치패드
  - `/student/study/session` 학습 세션 + 타이머 + 캔버스
  - `/student/progress` 단원 상태 + 개념 자료
  - `/student/wrong-answers` 학생 오답노트
- 보호자 UI 확장
  - `/study/reviews` 학습 리뷰 큐
- v1 캔버스 정책
  - 서버 저장은 PNG snapshot 1장/세션
  - 브라우저 `localStorage` 임시 복구 지원
- Hybrid TDD 확장
  - unit: 채점/시간 정규화/daily mission/상태 전이/review queue
  - route-contract: role/ownership/state transition
  - real integration: 학생 제출 -> 오답 -> 보호자 리뷰 -> 보드 반영
  - e2e: 학생 학습 -> 보호자 리뷰 -> 학생 피드백 확인

비포함 범위:

- OCR/서술형 자동 채점
- 필기 stroke replay / 공동 편집
- 개념/문제 authoring UI
- 추천 메시지/리포트 산출물(M5 유지)

## 1.12 M7 Scope Lock (2026-03-14)

포함 범위:

- 보호자/관리자 공용 내부 운영 화면 `/study/content`
  - `연습 세트`, `개념 자료` 2개 탭
  - 상단 필터: `schoolLevel`, `grade`, `semester`
- M7 authoring API 구현
  - `GET /api/v1/study/content`
  - `POST /api/v1/study/content/practice-sets`
  - `PUT /api/v1/study/content/practice-sets/{id}`
  - `PUT /api/v1/study/content/practice-sets/{id}/activation`
  - `PUT /api/v1/study/content/concepts/{curriculumNodeId}`
  - `DELETE /api/v1/study/content/concepts/{curriculumNodeId}`
- 연습 세트 authoring 규칙
  - 세트 단위 전체 문제 배열 저장
  - `single_choice`, `short_answer`, `difficulty`, `skillTags` 검증 고정
  - attempt가 존재하는 used set은 구조 수정 금지, 메타데이터만 허용
  - hard delete 없이 `isActive` 토글만 지원
- 개념 자료 authoring 규칙
  - `curriculumNodeId`당 1개 lesson 유지
  - 지원 block: `headline`, `visual_hint`, `steps`, `table`
  - delete 시 학생 진도/개념 보드에서 즉시 사라져야 함
- 학생 연동 유지
  - `/student/study/board`, `/student/study/session`, `/student/progress`는 authored content를 즉시 반영
- Hybrid TDD 확장
  - unit: skillTags normalize, structural edit guard, concept block validation
  - route-contract: guardian/admin 허용, student `403`, invalid payload `400`, used set `409`
  - real integration: create/deactivate/delete -> student board/progress 반영
  - e2e: guardian authoring -> student progress/session -> guardian lock 확인

비포함 범위:

- Prisma schema migration 추가
- subject 다과목 확장
- authoring draft/versioning/publish workflow
- iPad 수동 QA 문서화
- 보호자 분석 대시보드와 M6/M7 학습 데이터 통합
- 추천 메시지/리포트 산출물(M5 유지)

## 1.13 M8 Scope Lock (2026-03-15)

포함 범위:

- 기존 `/dashboard` 확장
  - `Study Insight` 섹션 추가
  - KPI 카드 4개: 리뷰 대기 세션, 복습 필요 단원, 최근 7일 학습 시간, 최근 7일 제출 세션 수
  - `지금 필요한 액션`, `리뷰 대기 미리보기`, `단원 상태 주의 목록` 추가
- M8 dashboard API 구현
  - `GET /api/v1/dashboard/study-overview`
- 규칙 기반 집계/추천 고정
  - 최근 활동 기준: 최근 7일
  - `pendingReviews = submittedAt != null && studyReview == null`
  - `attentionUnits`: `review_needed -> in_progress -> planned` 정렬, 최대 5개
  - `recommendedActions`: 미리뷰 제출 세션 -> `review_needed` 단원 -> 7일 이상 정체 `in_progress` -> `planned` 단원 순서, 최대 3개
- deep-link 흐름 정리
  - `/dashboard?studentId=` preselect
  - `/study/reviews?studentId=` preselect
  - dashboard action/review preview CTA -> `/study/reviews?studentId=...`
- Hybrid TDD 확장
  - unit: summary/action priority/stalled 기준
  - route-contract: role/ownership/date/empty shape
  - real integration: student submit -> pending review -> guardian review -> dashboard 갱신
  - e2e: dashboard insight -> review queue preselect

비포함 범위:

- Prisma schema migration
- downloadable weekly report / PDF / email digest
- LLM 코멘트 생성
- 복습 스케줄 자동화(1일/3일/7일 큐)
- iPad 수동 QA 문서화

## 2. MVP 작업 우선순위

- P0: 인증/학생 프로필/커리큘럼
- P0: 시도/문항/오답 저장
- P0: 대시보드 핵심 3개 차트
- P1: 리포트/추천 메시지
- P2: 고급 분석/자동화

## 3. 리스크

- 한국 수학 진도 데이터 버전 동기화 필요
- 권한/소유권 검증 누락 시 데이터 노출 위험
- 모바일 UX 복잡도 증가 가능

## 4. 대응

- asOfDate 기반 커리큘럼 버전 관리
- 보호자-학생 소유권 검증 규칙을 API 공통 가드로 강제
- 카테고리 가이드 문구 통일
- 모바일 우선 디자인 리뷰 주기 고정
