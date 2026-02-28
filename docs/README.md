# Docs Management Guide

이 폴더는 번호 기반 카테고리 구조로 관리합니다.

## 폴더 구조

- `01-product`: 제품 정의
- `02-architecture`: 시스템/데이터/API 설계
- `03-process`: 개발 프로세스, 계획, 프롬프트 템플릿
- `04-quality`: 테스트/검증/리뷰 기준
- `05-operations`: 상태 추적, 핸드오프, 의사결정 로그
- `06-data`: 외부 수집 데이터(원본/가공본)

## 빠른 시작

- 문서 인덱스: `/Users/mark/Documents/project/study-project/docs/INDEX.md`
- 진행 상태: `/Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md`
- 운영 체크리스트: `/Users/mark/Documents/project/study-project/docs/05-operations/OPERATIONS_CHECKLIST.md`

## 운영 규칙

- 기능/범위 변경: `01-product/PRD.md` 먼저 수정
- 기술/아키텍처 변경: `02-architecture/*` + `05-operations/DECISION_LOG.md` 갱신
- 일정/우선순위 변경: `03-process/DEVELOPMENT_PLAN.md` + `05-operations/PROJECT_STATUS.md` 동시 갱신
- 세션 시작/종료: `05-operations/HANDOFF.md` 체크리스트 준수

## 자동화 도구

- 링크/경로 검증: `/Users/mark/Documents/project/study-project/scripts/check-doc-links.sh`
- 템플릿:
  - `/Users/mark/Documents/project/study-project/docs/05-operations/templates/ADR_TEMPLATE.md`
  - `/Users/mark/Documents/project/study-project/docs/05-operations/templates/MEETING_NOTE_TEMPLATE.md`
  - `/Users/mark/Documents/project/study-project/docs/05-operations/templates/WORKLOG_TEMPLATE.md`
