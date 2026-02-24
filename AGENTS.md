# AGENTS.md

이 파일은 이 저장소에서 작업하는 에이전트(예: Codex)를 위한 실행 규칙이다.

## 1. 목표

- 중학생 수학 성취 대시보드 MVP를 문서 기준으로 일관되게 개발한다.
- 세션이 바뀌어도 동일한 품질 기준과 운영 흐름을 유지한다.

## Specialist Agents

- `study-architecture-expert`
- `study-review-expert`
- `study-test-expert`
- `study-ux-ui-expert`
- `study-documentation-expert`

Roster:
- `/Users/mark/Documents/project/study-project/docs/03-process/AGENT_ROSTER.md`

## 2. 시작 절차 (필수)

1. `/Users/mark/Documents/project/study-project/docs/CONTEXT_INDEX.md` 확인 (요약 우선)
2. `/Users/mark/Documents/project/study-project/docs/INDEX.md` 확인 (전체 네비게이션)
3. `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md` 확인
4. `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` 확인
5. 요청 작업이 `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md` 범위와 일치하는지 확인

## 3. 문서 동기화 규칙 (필수)

- 설계/스택/아키텍처 변경: 관련 문서 + `DECISION_LOG.md` 갱신
- 일정/우선순위 변경: `DEVELOPMENT_PLAN.md` + `PROJECT_STATUS.md` 갱신
- 세션 종료 시: `PROJECT_STATUS.md` Change Log 갱신

## 4. 품질 규칙

- Hybrid TDD 원칙 준수
- 코드 변경 시 테스트/검증 결과를 함께 보고
- 문서 변경 시 링크 검증 스크립트 실행 권장:
  - `/Users/mark/Documents/project/study-project/scripts/check-doc-links.sh`

## 5. 문서 템플릿

- ADR: `/Users/mark/Documents/project/study-project/docs/05-operations/templates/ADR_TEMPLATE.md`
- 회의록: `/Users/mark/Documents/project/study-project/docs/05-operations/templates/MEETING_NOTE_TEMPLATE.md`
- 작업로그: `/Users/mark/Documents/project/study-project/docs/05-operations/templates/WORKLOG_TEMPLATE.md`
