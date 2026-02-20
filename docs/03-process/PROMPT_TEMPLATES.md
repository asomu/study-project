# Prompt Templates

## 1) 프롬프트 포맷 (권장)

아래 8블록으로 작성하면, 세션마다 일관된 결과를 얻기 쉽습니다.

1. 목표
- 이번 세션에서 달성할 1~3개 결과

2. 범위
- In scope
- Out of scope

3. 기술/환경 제약
- 스택, 배포 환경, 운영 제약

4. 품질 기준
- 테스트, 리뷰, 성능, 보안 기준

5. 산출물
- 생성/수정할 파일 경로를 명시

6. 실행 방식
- Plan -> Implement -> Verify -> Report 순서

7. 상태 업데이트 규칙
- 작업 시작/중간/완료 시 어떤 문서를 갱신할지

8. 응답 형식
- 보고 형식, 체크리스트, 다음 액션

## 2) 개발 초기 설정 프롬프트 (복붙용)

```text
프로젝트: /Users/mark/Documents/project/study-project

목표:
- MVP 개발 시작 전, 실행 가능한 초기 코드베이스를 구성한다.
- 문서(설계/상태)와 코드 변경을 동기화한다.

범위:
- In scope:
  1) Next.js(TypeScript) 앱 초기화
  2) Prisma/PostgreSQL 기본 연결
  3) Docker Compose 로컬 실행(web, db, redis, minio, caddy)
  4) 기본 모듈 골격(auth, curriculum, assessment, mistake-note, analytics, dashboard)
  5) 테스트 도구 세팅(vitest, playwright)
- Out of scope:
  - 고급 분석 알고리즘 완성
  - 멀티 과목 지원

제약:
- 맥미니 로컬 호스팅 우선
- 모바일 우선 반응형
- 기존 문서 기준 준수:
  - /Users/mark/Documents/project/study-project/docs/01-product/PRD.md
  - /Users/mark/Documents/project/study-project/docs/02-architecture/SYSTEM_ARCHITECTURE.md
  - /Users/mark/Documents/project/study-project/docs/04-quality/TEST_AND_VALIDATION.md

품질 기준:
- tsc/lint/test 기본 파이프라인이 실행되어야 함
- 최소 1개 단위 테스트 + 1개 E2E 스모크 테스트 포함

산출물:
- 코드: apps/web, infra/docker, infra/caddy
- 문서 업데이트:
  - /Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md
  - /Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md

실행 방식:
- 1) Plan 업데이트
- 2) 코드 생성/수정
- 3) 로컬 검증 명령 실행
- 4) 결과 보고(성공/실패/리스크/다음액션)

응답 형식:
- 변경 요약
- 파일 목록
- 실행한 검증 명령과 핵심 결과
- 남은 리스크
- 다음 작업 3개
```

## 3) 세션 진행 프롬프트 (복붙용)

```text
이번 세션 작업:
- [여기에 작업 1~3개]

필수 규칙:
1) 먼저 아래 문서를 읽고 현재 상태를 요약:
   - /Users/mark/Documents/project/study-project/docs/05-operations/PROJECT_STATUS.md
   - /Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md
2) 작업 전 plan 업데이트
3) 작업 완료 후 문서 동기화:
   - PROJECT_STATUS.md change log 갱신
   - 결정 사항 있으면 DECISION_LOG.md 추가
4) 마지막에 아래 형식으로 보고:
   - Done
   - In Progress
   - Blocked
   - Next (1~3)
```
