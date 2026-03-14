# M6 학생 학습 루프 기술 설명

- Date: 2026-03-08
- Source Skill: `study-tech-explainer`
- Related Scope: M6

## 1. 30초 요약

- 구현 목표: 학생이 직접 학습하고, 풀이를 남기고, 오답을 정리하고, 보호자가 같은 흐름 안에서 리뷰와 진도 상태를 관리하도록 만든다.
- 핵심 기술: `Study` 모듈 분리, `Attempt/WrongAnswer` 재사용, Prisma 스키마 확장, PNG 캔버스 snapshot 저장, Hybrid TDD.
- 결과: 학생 학습 보드, 학습 세션, 학생 오답노트, 학생 진도/개념 보드, 보호자 리뷰 큐가 하나의 데이터 흐름으로 연결되었다.

## 2. 기술별 설명

### 2.1 Study 모듈 + 기존 Assessment 재사용

- 한 줄 정의: 새 학습 기능은 별도 `Study` 모듈에서 조합하되, 실제 풀이 결과는 기존 `Attempt`, `AttemptItem`, `WrongAnswer`에 저장하는 구조다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/study/service.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/study/sessions/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/study/sessions/[id]/submit/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/study/reviews/[sessionId]/route.ts`
- 왜 이걸 선택했는가:
  - `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` ADR-0017에서 M2/M3 파이프라인 회귀를 줄이기 위해 `Attempt/WrongAnswer` 재사용을 고정했다.
  - 기존 분석/오답 파이프라인을 버리지 않고 학생 기능을 확장해야 했기 때문이다.
- 대안과 트레이드오프:
  - 대안: 학생 학습용 별도 `StudySession`, `StudyItem`, `StudyWrongAnswer` 테이블을 새로 만든다.
  - 트레이드오프: 의미는 분리되지만, M2/M3 대시보드와 오답 흐름을 다시 연결해야 해서 구현량과 회귀 위험이 커진다.
- 실무에서 자주 하는 실수:
  - 새 기능을 추가하면서 기존 핵심 테이블과 중복되는 모델을 또 만들어 데이터가 두 갈래로 갈라지는 것.
  - nullable 완화를 쉽게 선택해 무결성이 약해지는 것.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`에서 `Attempt.materialId`가 여전히 필수인지 확인하고, `/student/study/sessions` 시작 시 숨김 system material이 생성되는지 DB에서 확인한다.

### 2.2 Prisma 스키마 확장으로 학습 루프 상태를 분리 저장

- 한 줄 정의: 문제세트, 개념자료, 리뷰, 진도 상태처럼 “학습 운영 상태”는 새 테이블로 분리하고, 실제 채점 결과는 기존 시도 테이블에 붙인다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/migrations/20260308021500_m6_student_study_loop/migration.sql`
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/seed.ts`
- 왜 이걸 선택했는가:
  - `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md`의 M6 요구는 “문제 제공”, “개념 학습”, “보호자 피드백”, “단원 상태 관리”를 같이 다뤄야 했다.
  - `/Users/mark/Documents/project/study-project/docs/02-architecture/DATA_MODEL.md`에서 분석용 snapshot과 운영 상태를 분리해야 한다고 정리했다.
- 대안과 트레이드오프:
  - 대안: `Attempt` 테이블에 모든 상태 컬럼을 추가해 한 테이블에 몰아넣는다.
  - 트레이드오프: 처음엔 단순해 보여도, 개념자료/단원상태/리뷰 큐가 attempt 수명주기와 달라서 곧 복잡해진다.
- 실무에서 자주 하는 실수:
  - “학습 상태”와 “채점 결과”를 같은 테이블에서 관리해 의미가 뒤섞이는 것.
  - seed 데이터가 문서/테스트 계약과 맞지 않아 실DB 검증이 실패하는 것.
- 바로 해볼 체크:
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web prisma migrate deploy`
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web prisma db seed`
  - 실행 후 `practice_sets`, `concept_lessons`, `student_unit_progress` 테이블에 데이터가 들어오는지 확인한다.

### 2.3 PNG 캔버스 snapshot + localStorage 복구

- 한 줄 정의: 학생 필기는 stroke 로그를 서버에 보내지 않고, 제출 시점의 PNG 한 장만 저장하는 방식이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/components/study/study-canvas.tsx`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/study/service.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/mistake-note/upload.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/(protected)/student/study/session/study-session-panel.tsx`
- 왜 이걸 선택했는가:
  - `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` ADR-0018에서 MVP는 제출 증빙과 보호자 리뷰에 필요한 최소 산출물만 저장하기로 고정했다.
  - iPad 입력은 중요하지만 stroke replay까지 넣으면 서버/네트워크/복구 로직이 크게 복잡해진다.
- 대안과 트레이드오프:
  - 대안: stroke 배열을 서버 autosave로 저장한다.
  - 트레이드오프: 복원력은 좋아지지만 저장량과 동기화 비용이 커지고, 협업/버전 관리 요구까지 따라오기 쉽다.
- 실무에서 자주 하는 실수:
  - data URL을 그대로 DB에 저장해 크기와 전송량이 급격히 커지는 것.
  - MIME만 보고 저장해서 실제 파일 시그니처 검증을 빼먹는 것.
- 바로 해볼 체크:
  - 학생 학습 세션에서 필기 후 제출하고 `study_work_artifacts.image_path`가 기록되는지, 업로드 파일이 `public/uploads/study-work`에 생기는지 확인한다.

### 2.4 Hybrid TDD로 학생-보호자 루프를 단계별 고정

- 한 줄 정의: 계산 함수, API 권한, 실제 DB 흐름, 브라우저 사용자 시나리오를 서로 다른 레벨 테스트로 나눠 검증하는 방식이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/tests/unit/study-service.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/integration/study-routes.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/real-integration/study-loop-real.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/e2e/study-loop.spec.ts`
- 왜 이걸 선택했는가:
  - 학생 학습 루프는 자동채점, 권한 분리, 오답 생성, 보호자 리뷰, 진도 상태 반영이 한 번에 연결되므로 한 레벨 테스트만으로는 회귀를 막기 어렵다.
  - `/Users/mark/Documents/project/study-project/docs/04-quality/TEST_AND_VALIDATION.md`의 Hybrid TDD 원칙을 그대로 따른다.
- 대안과 트레이드오프:
  - 대안: e2e 위주로만 확인한다.
  - 트레이드오프: 사용자 흐름은 보이지만, progress 상태 전이와 current semester 필터 같은 세밀한 회귀를 빠르게 잡기 어렵다.
- 실무에서 자주 하는 실수:
  - 성공 시나리오만 고정하고 `401/403/404/409` 같은 실패 경로를 빼먹는 것.
  - mock 테스트만 믿고 실DB/실브라우저 검증을 생략하는 것.
- 바로 해볼 체크:
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web test:route-contract`
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web test:integration:real`
  - 둘 다 통과하면 권한/상태 전이/실DB 루프가 같이 검증된다.

## 3. 요청부터 동작까지 흐름

1. 입력:
  - 학생이 `/student/dashboard`에서 오늘 미션 또는 단원 학습을 선택한다.
  - 화면 경로:
    - `/Users/mark/Documents/project/study-project/apps/web/src/app/(protected)/student/dashboard/student-dashboard-panel.tsx`
    - `/Users/mark/Documents/project/study-project/apps/web/src/app/(protected)/student/study/session/study-session-panel.tsx`

2. 서버 처리:
  - `POST /api/v1/student/study/sessions`가 현재 학기 practice set인지 확인하고 open session을 재사용하거나 새로 만든다.
  - `POST /api/v1/student/study/sessions/{id}/submit`가 자동채점, elapsedSeconds 정규화, wrongAnswer 생성, PNG 저장을 처리한다.

3. DB/상태 반영:
  - 풀이 결과는 `attempts`, `attempt_items`, `wrong_answers`에 기록된다.
  - 개념/진도/리뷰 상태는 `concept_lessons`, `student_unit_progress`, `study_reviews`, `study_work_artifacts`에 반영된다.

4. 응답:
  - 학생 보드는 daily mission, 최근 세션, 최신 피드백을 다시 보여준다.
  - 보호자는 `/study/reviews`에서 리뷰를 남기고 `/study/progress`에서 단원 상태를 확인하거나 수정한다.

## 4. 학습 확인 질문

1. 왜 M6에서 학생 학습 결과를 새 테이블만으로 만들지 않고 `Attempt/WrongAnswer`를 재사용했을까요?
2. `student_unit_progress`와 `mastery_snapshots`는 둘 다 단원 상태처럼 보이는데, 왜 목적이 다를까요?
3. PNG snapshot 저장 방식이 stroke replay보다 단순한 대신 잃는 것은 무엇일까요?

## 5. 메모

- 확실한 사실:
  - M6는 `PracticeSet`, `ConceptLesson`, `StudyReview`, `StudentUnitProgress`를 추가하고 학생/보호자 학습 루프 화면과 API를 구현했다.
  - closeout review에서 current semester 경계 누락을 수정했고, unit/route-contract/real integration/e2e/build를 모두 재검증했다.
- 추론(검증 필요):
  - 운영자가 문제세트와 개념자료를 자주 수정해야 하는 상황이 되면 authoring UI가 다음 큰 병목이 될 가능성이 높다.
