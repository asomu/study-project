# M3 대시보드 MVP 기술 설명

- Date: 2026-02-24
- Source Skill: `study-tech-explainer`
- Related Scope: M3

## 1. 30초 요약 (Level 1)

- 구현 목표: 로그인한 보호자가 학생의 최근 학습 상태를 한 화면(`/dashboard`)에서 바로 이해하도록 만든다.
- 핵심 기술: `attempt_items` 직접 집계, JWT+소유권 가드, SVG/CSS 차트, Hybrid TDD.
- 결과: M3 API 3종(`overview`, `weakness`, `trends`)과 실사용형 대시보드 UI, 회귀 테스트 세트가 함께 완성되었다.

## 2. 기술별 설명

### 2.1 `attempt_items` 직접 집계 기반 분석 모듈

- 한 줄 정의: 저장된 문항 데이터에서 바로 지표를 계산해 대시보드 수치를 만드는 방식이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/analytics/dashboard-metrics.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/dashboard/date-range.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/dashboard/overview/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/dashboard/weakness/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/dashboard/trends/route.ts`
- 왜 이걸 선택했는가:
  - `DEVELOPMENT_PLAN.md` M3 Scope Lock에서 “분석 데이터: attempt_items 직접 집계”로 고정했다.
  - `DECISION_LOG.md` ADR-0011에서 재현성과 추적 가능성을 우선한다고 명시했다.
- 대안과 트레이드오프:
  - 대안: 배치로 `mastery_snapshots`를 미리 계산해 조회 성능을 높일 수 있다.
  - 트레이드오프: MVP 단계에서는 배치 복잡도/운영 부담이 커서, 직접 집계가 더 단순하고 안전하다.
- 실무에서 자주 하는 실수:
  - 기준일(`asOfDate`) 경계를 빠뜨려 미래 데이터가 섞이는 실수.
  - 분모/분자의 커리큘럼 버전을 다르게 잡아 `actualPct`가 왜곡되는 실수.
- 바로 해볼 체크:
  - `GET /api/v1/dashboard/overview?studentId=<id>&date=2026-02-21` 호출 후 `summary.asOfDate`와 `progress.actualPct`가 기대와 맞는지 확인.

### 2.2 JWT + 소유권 가드(권한 경계)

- 한 줄 정의: 로그인은 JWT로 확인하고, 데이터 접근은 “이 학생이 내 학생인지”를 서버에서 다시 검증한다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/session.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/ownership-guard.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/dashboard/overview/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/dashboard/weakness/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/dashboard/trends/route.ts`
- 왜 이걸 선택했는가:
  - PRD의 보호자-학생 모델과 ADR-0004(IDOR 방지) 요구를 그대로 따르기 위해서다.
- 대안과 트레이드오프:
  - 대안: 역할 기반 미들웨어만 쓰고 라우트에서 추가 검증을 생략.
  - 트레이드오프: 구현은 편하지만 `studentId` 바꿔치기 공격을 막기 어렵다.
- 실무에서 자주 하는 실수:
  - 인증(로그인 여부)만 검사하고 소유권 체인(`studentId`, `attemptId`, `wrongAnswerId`) 검증을 빼먹는 것.
- 바로 해볼 체크:
  - 타 보호자 `studentId`로 대시보드 API 호출 시 `403 FORBIDDEN`이 나오는지 확인.

### 2.3 차트 라이브러리 없이 SVG/CSS로 구현

- 한 줄 정의: 외부 차트 패키지 없이 브라우저 기본 SVG로 라인/바 시각화를 그린다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/components/dashboard/trends-line-chart.tsx`
  - `/Users/mark/Documents/project/study-project/apps/web/src/components/dashboard/progress-comparison.tsx`
  - `/Users/mark/Documents/project/study-project/apps/web/src/components/dashboard/category-distribution-chart.tsx`
- 왜 이걸 선택했는가:
  - M3 결정사항에서 “외부 라이브러리 없이 SVG/CSS 구현”으로 확정되어 의존성 증가를 피했다.
- 대안과 트레이드오프:
  - 대안: Recharts 같은 라이브러리 도입.
  - 트레이드오프: 개발 속도는 빨라질 수 있지만 번들/의존성/커스터마이징 관리가 늘어난다.
- 실무에서 자주 하는 실수:
  - 축/좌표 계산을 하드코딩해 데이터 개수가 바뀌면 라인이 찌그러지는 문제.
  - 0건 데이터에서 차트가 깨지는 문제(빈 상태 메시지 누락).
- 바로 해볼 체크:
  - 학생 전환으로 데이터가 0건일 때 차트 대신 빈 상태 안내가 뜨는지 확인.

### 2.4 Hybrid TDD로 회귀 방지

- 한 줄 정의: 계산 로직은 unit, API 계약은 integration, 사용자 흐름은 e2e로 나눠 검증하는 전략이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/tests/unit/dashboard-metrics.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/integration/dashboard-routes.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/e2e/dashboard-m3.spec.ts`
- 왜 이걸 선택했는가:
  - `TEST_AND_VALIDATION.md`와 ADR-0003에서 대시보드/분석 로직은 Hybrid TDD가 적합하다고 규정했다.
- 대안과 트레이드오프:
  - 대안: e2e 중심으로만 검증.
  - 트레이드오프: 실제 화면은 검증되지만 수식/경계 조건 회귀를 빠르게 잡기 어렵다.
- 실무에서 자주 하는 실수:
  - API 성공 케이스만 테스트하고 `401/403/400` 실패 경로를 놓치는 것.
  - mock 데이터와 실제 도메인 규칙이 어긋나 테스트가 “통과하지만 의미 없는 상태”가 되는 것.
- 바로 해볼 체크:
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web test:integration` 실행 후 dashboard-routes 테스트가 모두 통과하는지 확인.

## 3. 요청부터 동작까지 흐름 (Level 2)

1. 입력:
- 사용자가 `/dashboard`에서 학생/기준일/기간을 선택한다.
- 경로: `/Users/mark/Documents/project/study-project/apps/web/src/app/(protected)/dashboard/dashboard-panel.tsx`

2. 서버 처리:
- 클라이언트가 동시에 3개 API를 호출한다.
  - `GET /api/v1/dashboard/overview`
  - `GET /api/v1/dashboard/weakness`
  - `GET /api/v1/dashboard/trends`
- 각 라우트는 JWT 세션 확인 후 `assertStudentOwnership`으로 소유권을 검증한다.

3. DB/상태 반영:
- `attempt_items`/`wrong_answers`에서 기간별 데이터를 조회한다.
- `dashboard-metrics.ts`에서 계산 규칙(권장진도/실제진도/약점 랭킹/주간 추이)을 적용한다.

4. 응답:
- 표준 JSON으로 반환된 값을 대시보드 카드/차트 컴포넌트가 렌더링한다.
- 데이터가 없으면 빈 상태 CTA를 보여준다.

## 4. Level 3 (심화)

- 필요하면 다음을 추가로 깊게 설명할 수 있다.
  - `overallScorePct` 계산식의 일관성(score variance) 해석
  - UTC 날짜 경계 처리(`startOfDayUtc`, `endOfDayUtc`)가 왜 중요한지
  - `actualPct`에서 커리큘럼 버전 정합성을 맞추는 이유

## 5. 학습 확인 질문

1. `overview`에서 `asOfDate`를 받는 이유를 한 문장으로 설명해볼 수 있나요?
2. `AUTH_REQUIRED`와 `FORBIDDEN`의 차이를 실제 예시로 말해볼 수 있나요?
3. 차트 라이브러리 대신 SVG를 썼을 때 얻는 이점과 손해를 하나씩 말해볼 수 있나요?

## 6. 메모

- 확실한 사실:
  - M3는 `attempt_items` 직접 집계 + SVG/CSS 차트 + `/dashboard` 단일 화면으로 구현되었다.
  - 대시보드 API 3종과 unit/integration/e2e 테스트가 모두 추가되었다.
- 추론(검증 필요):
  - 추후 M4에서 데이터 양이 커지면 pre-aggregation(사전 집계) 전략이 필요할 가능성이 높다.
