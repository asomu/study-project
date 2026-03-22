# Context Index

- Last Updated: 2026-03-22
- Purpose: 새 세션에서 2~3분 내 현재 제품 상태를 파악하기 위한 요약 허브

## 1. Quick Snapshot

- Current Phase: M10 Workbook Progress + Wrong Note Link Verified
- Overall Progress: 100%
- Current Focus:
  - workbook progress UI/API 운영 안정화
  - guardian workbook template 관리 UX polish 여부 결정
  - repo 밖 wrong-note 저장소와 guarded image API 운영 안정화
  - storage audit / backup 루틴 고정
  - 모바일 업로드/상세 드로어 수동 QA
  - 후속 범위(OCR/자동 피드백/리포트) 우선순위 정리
- Top Risks:
  - guardian workbook template 수정 UX는 현재 prompt 기반이라 운영 편의 개선 여지가 있다.
  - OCR, 자동 피드백, 재도전 상태 추적은 아직 없다.
  - 레거시 `wrong-answer`/`study` 기능이 코드베이스에 남아 있어 추가 정리 판단이 필요하다.
  - 기존 `public/uploads/wrong-notes`에 저장되었다가 이미 유실된 파일은 자동 복구되지 않는다.

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
| 현재 제품 범위 | `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md` | 오답노트 + 문제집 진도 제품 목표와 수용 기준 확인 |
| API/데이터 계약 | `/Users/mark/Documents/project/study-project/docs/02-architecture/API_SPEC_V1.md` | wrong-note/workbook 학생·보호자 API와 권한 규칙 확인 |
| 시스템 구조 | `/Users/mark/Documents/project/study-project/docs/02-architecture/SYSTEM_ARCHITECTURE.md` | `WrongNote` + `Workbook` 모듈 경계와 레거시 경계 확인 |
| 데이터 모델 | `/Users/mark/Documents/project/study-project/docs/02-architecture/DATA_MODEL.md` | `wrong_notes`, `workbook_*` 스키마와 파생 규칙 확인 |
| 현재 진행률/다음 액션 | `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md` | 이번 세션 우선순위와 리스크 확인 |
| 결정 히스토리 | `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` | WrongNote 전환과 Workbook 도메인 분리 결정 이유 추적 |
| 세션 연속성 | `/Users/mark/Documents/project/study-project/docs/05-operations/HANDOFF.md` | 직전 세션 완료 항목과 다음 액션 확인 |
| 일정/범위 락 | `/Users/mark/Documents/project/study-project/docs/03-process/DEVELOPMENT_PLAN.md` | M10 범위와 검증 계획 확인 |
| 테스트 전략 | `/Users/mark/Documents/project/study-project/docs/04-quality/TEST_AND_VALIDATION.md` | Hybrid TDD 게이트와 E2E 기준 확인 |

## 4. Maintenance Rule

- 아래 중 하나가 바뀌면 같은 세션에 이 문서 Snapshot을 갱신한다.
  - Current Phase / Progress
  - Top Risks
  - Current Focus
  - Bootstrap Order
