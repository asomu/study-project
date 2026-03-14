# Context Index

- Last Updated: 2026-03-15
- Purpose: 새 세션에서 2~3분 내 프로젝트 상태를 파악하기 위한 요약 허브
- Usage: 이 문서에서 요약을 먼저 확인하고, 필요한 항목만 링크 문서로 내려간다.

## 1. Quick Snapshot

- Current Phase: M8 Guardian Study Dashboard Verified
- Overall Progress: 100%
- Current Focus:
  - M8 study insight 운영 흐름을 안정적으로 유지
  - 수동 iPad QA 실행
  - M5 deferred와 authoring 후속 범위 재우선순위화
- Top Risks:
  - iPad/Pencil 필기 입력은 아직 수동 검증이 필요하다.
  - 보호자 대시보드 액션 카드는 규칙 기반이며, 주간 브리프/리포트/PDF/email digest는 아직 없다.
  - authoring은 v1 폼 기반이라 draft/versioning/publish workflow와 bulk import/export는 아직 없다.

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
| 제품 범위 확인 | `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md` | 현재 요청이 구현 범위와 일치하는지 판단 |
| API/데이터 계약 확인 | `/Users/mark/Documents/project/study-project/docs/02-architecture/API_SPEC_V1.md` | M8 포함 API 계약과 권한 규칙 확인 |
| 현재 진행률/다음 액션 | `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md` | 세션 우선순위와 남은 리스크 확인 |
| 결정 히스토리 | `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` | Study 모듈/캔버스 저장 정책 등 설계 이유 추적 |
| 세션 연속성 | `/Users/mark/Documents/project/study-project/docs/05-operations/HANDOFF.md` | 직전 세션에서 끝낸 일과 다음 액션 파악 |
| 일정/범위 락 | `/Users/mark/Documents/project/study-project/docs/03-process/DEVELOPMENT_PLAN.md` | M5 deferred와 M8 완료 범위 확인 |
| 테스트 전략 | `/Users/mark/Documents/project/study-project/docs/04-quality/TEST_AND_VALIDATION.md` | Hybrid TDD 게이트와 수동 QA 잔여 항목 확인 |
| 기술 설명 학습 | `/Users/mark/Documents/project/study-project/docs/07-learning/TECH_EXPLAINER_INDEX.md` | 구현 기술을 복습용 노트로 따라가기 |

## 4. Maintenance Rule

- 아래 중 하나가 바뀌면 이 문서의 Snapshot을 같은 세션에 갱신한다.
  - Current Phase / Progress
  - Top Risks
  - Next Actions 우선순위
  - Bootstrap Order
