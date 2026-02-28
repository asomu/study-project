# Context Index

- Last Updated: 2026-02-28
- Purpose: 새 세션에서 2~3분 내 프로젝트 상태를 파악하기 위한 요약 허브
- Usage: 이 문서에서 요약을 먼저 확인하고, 필요한 항목만 링크 문서로 내려간다.

## 1. Quick Snapshot

- Current Phase: Verify (M4 Completed / Release Gate Locked)
- Overall Progress: 100%
- Current Focus: M3 지표 해석 가이드 보강, 외부 공개 사전 점검, M5 후보 우선순위화
- Top Risks:
  - M3 지표 해석 가이드 부족
  - 외부 공개 전 TLS/접근 제어 리허설 필요
  - 운영 체크리스트의 주기 실행 누락 가능성

Source:
- `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md`

## 2. Session Bootstrap Order (Required)

1. `/Users/mark/Documents/project/study-project/docs/CONTEXT_INDEX.md`
2. `/Users/mark/Documents/project/study-project/docs/INDEX.md`
3. `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md`
4. `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md`
5. `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md`

## 3. Deep Link Map

| What You Need | Read This | Why |
| --- | --- | --- |
| 제품 범위 확인 | `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md` | 현재 요청이 MVP 범위인지 판단 |
| API/데이터 계약 확인 | `/Users/mark/Documents/project/study-project/docs/02-architecture/API_SPEC_V1.md` | 구현/테스트 기준 계약 확인 |
| 현재 진행률/다음 액션 | `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md` | 세션 우선순위 결정 |
| 결정 히스토리 | `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` | 왜 이렇게 설계했는지 추적 |
| 세션 연속성 | `/Users/mark/Documents/project/study-project/docs/05-operations/HANDOFF.md` | 직전 세션 완료/미완료 파악 |
| 일정/범위 락 | `/Users/mark/Documents/project/study-project/docs/03-process/DEVELOPMENT_PLAN.md` | 마일스톤 범위 이탈 방지 |
| 테스트 전략 | `/Users/mark/Documents/project/study-project/docs/04-quality/TEST_AND_VALIDATION.md` | Hybrid TDD 게이트 확인 |

## 4. Maintenance Rule

- 아래 중 하나가 바뀌면 이 문서의 Snapshot을 같은 세션에 갱신한다.
  - Current Phase / Progress
  - Top Risks
  - Next Actions 우선순위
  - Bootstrap Order
