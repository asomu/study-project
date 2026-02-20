# Project Status

- Last Updated: 2026-02-20
- Current Phase: Plan Mode
- Overall Progress: 38%

## 1. Milestone Status

| Milestone | Status | Progress | Owner | Notes |
| --- | --- | --- | --- | --- |
| M0 설계/문서화 | COMPLETED | 100% | Team | 권한/버전/데이터소스/운영정책 리스크 반영 완료 |
| M1 기반 구축 | NOT_STARTED | 0% | Team | 프로젝트 초기화 대기 |
| M2 핵심 입력 기능 | NOT_STARTED | 0% | Team | M1 완료 후 시작 |
| M3 대시보드 MVP | NOT_STARTED | 0% | Team | M2 완료 후 시작 |
| M4 검증/안정화 | NOT_STARTED | 0% | Team | 후반 단계 |

## 2. Current Sprint Focus

- [x] PRD/아키텍처/스택 정의
- [x] 개발 프로세스/테스트/리뷰 정책 정의
- [x] DB 상세 스키마(ERD 수준) 초안 작성
- [x] API 명세 v1 초안 작성
- [x] 수학 진도 데이터 소스 수집(NCIC API 기반)
- [x] 세션용 프롬프트 템플릿 작성
- [x] docs 카테고리 구조화 및 경로 정리
- [x] 문서 템플릿(ADR/회의록/작업로그) 추가
- [x] 문서 링크/경로 검증 스크립트 추가 및 검증 완료
- [x] 프로젝트용 AGENTS.md 추가
- [x] specialist agents 5종(architecture/review/test/ux-ui/docs) 생성
- [x] API 권한/소유권 규칙 명세 강화(IDOR 대응)
- [x] 커리큘럼 버전 선택 규칙(asOfDate/curriculumVersion) 명세 강화
- [x] FR 수용 기준 및 테스트 추적 규칙 반영
- [x] 성취수준 상세 404 리스크 대응 데이터소스 정책 확정
- [x] Mac mini 외부 접근 정책 문서화
- [ ] Next.js 프로젝트 부트스트랩

## 3. Risks and Blocks

- 현재 차단(Blocker) 없음
- 운영 모니터링 항목:
  - 디자인 산출물 품질(Figma 노드/레퍼런스 확보 여부)
  - 외부 공개 시 TLS/접근제어 설정 점검

## 4. Next Actions

1. Figma 레퍼런스 수집 또는 와이어프레임 시작
2. Prisma schema + migration 파일 작성
3. 프로젝트 초기 코드베이스 생성

## 5. Change Log

- 2026-02-20: 계획 문서 세트 초기 생성
- 2026-02-20: DB 모델/API 명세 초안 추가
- 2026-02-20: NCIC 데이터 소스(JSON/PDF) 수집 및 프롬프트 템플릿 추가
- 2026-02-20: docs 카테고리 구조(01~06) 재편 및 문서 경로 갱신
- 2026-02-20: 문서 템플릿/링크검증 스크립트/AGENTS.md 추가
- 2026-02-20: specialist agents 5종 추가 및 agent roster 문서화
- 2026-02-20: 리뷰 리스크(권한/버전/데이터소스/운영정책) 해결 반영
- 2026-02-20: study-code-cleanup 수행(리뷰 완료, 추가 수정사항 없음, 커밋 준비)
