# Engineering Process

## 1. Definition of Ready (DoR)

작업 시작 조건:

- 요구사항이 PRD 항목으로 명시됨
- 수용 기준(acceptance criteria) 존재
- 데이터/API 영향도 확인 완료
- 테스트 관점(성공/실패 케이스) 정의 완료

## 2. Definition of Done (DoD)

작업 완료 조건:

- 기능 동작 확인
- 단위/통합 테스트 통과
- E2E 스모크 통과
- 리뷰 완료
- 상태 문서 업데이트 완료

## 3. 브랜치/커밋 정책

- 브랜치: `codex/<feature-name>`
- 커밋: 작은 단위, 의미 중심 메시지
- PR: 변경 이유 + 테스트 결과 + 리스크

## 4. 문서 운영 정책

- 제품 방향 변경: `PRD.md` 우선 수정
- 기술 선택 변경: `TECH_STACK.md` + `DECISION_LOG.md` 기록
- 일정 변경: `DEVELOPMENT_PLAN.md` + `PROJECT_STATUS.md` 동시 반영

## 5. 세션 운영

- 세션 시작: `PROJECT_STATUS.md`의 Next Actions 확인
- 세션 종료: 완료/미완료/리스크를 상태 문서와 핸드오프에 기록
