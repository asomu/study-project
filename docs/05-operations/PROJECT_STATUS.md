# Project Status

- Last Updated: 2026-02-21
- Current Phase: Build (M1)
- Overall Progress: 63%

## 1. Milestone Status

| Milestone | Status | Progress | Owner | Notes |
| --- | --- | --- | --- | --- |
| M0 설계/문서화 | COMPLETED | 100% | Team | 권한/버전/데이터소스/운영정책 리스크 반영 완료 |
| M1 기반 구축 | IN_PROGRESS | 90% | Team | 코드/테스트 완료, DB 런타임 검증 대기 |
| M2 핵심 입력 기능 | NOT_STARTED | 0% | Team | M1 종료 후 시작 |
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
- [x] Next.js 프로젝트 부트스트랩(pnpm workspace, App Router, Tailwind, ESLint/Prettier)
- [x] Prisma schema/migration/seed 파일 작성
- [x] JWT 인증 API + 학생 기본 API + 소유권 가드 스캐폴딩 구현
- [x] 로그인/대시보드 기본 레이아웃 및 보호 라우팅 구현
- [x] Unit/Integration/E2E smoke 테스트 게이트 구성 및 통과
- [x] 클로즈아웃 리뷰 반영(Prisma config 전환, Playwright 산출물 ignore)
- [x] `study-tech-explainer` 학습 노트 영역 신설 및 M1 설명 문서화
- [ ] PostgreSQL 컨테이너 실제 기동 후 migrate/seed 런타임 검증

## 3. Risks and Blocks

- 환경 블록: 현재 작업 머신에 `docker`, `psql` 미설치로 DB 런타임 검증이 지연됨
- 운영 모니터링 항목:
  - 디자인 산출물 품질(Figma 노드/레퍼런스 확보 여부)
  - 외부 공개 시 TLS/접근제어 설정 점검

## 4. Next Actions

1. Docker/DB 실행 가능한 환경에서 `docker compose -f infra/docker/docker-compose.local.yml up -d` 실행
2. `pnpm -C apps/web prisma migrate deploy` + `pnpm -C apps/web prisma:seed` 성공 여부 확인 후 M1 완료 처리
3. `study-tech-explainer` 사용 시 `docs/07-learning` 인덱스와 학습 노트를 지속 업데이트

## 5. Change Log

- 2026-02-20: 계획 문서 세트 초기 생성
- 2026-02-20: DB 모델/API 명세 초안 추가
- 2026-02-20: NCIC 데이터 소스(JSON/PDF) 수집 및 프롬프트 템플릿 추가
- 2026-02-20: docs 카테고리 구조(01~06) 재편 및 문서 경로 갱신
- 2026-02-20: 문서 템플릿/링크검증 스크립트/AGENTS.md 추가
- 2026-02-20: specialist agents 5종 추가 및 agent roster 문서화
- 2026-02-20: 리뷰 리스크(권한/버전/데이터소스/운영정책) 해결 반영
- 2026-02-20: study-code-cleanup 수행(리뷰 완료, 추가 수정사항 없음, 커밋 준비)
- 2026-02-20: M1 기반 구축 코드/테스트/문서 반영 (DB 런타임 검증만 환경 대기)
- 2026-02-20: study-code-cleanup 재수행(리뷰 2건 수정, 문서 동기화, 커밋 준비)
- 2026-02-21: `study-tech-explainer` 학습 보관 영역(`docs/07-learning`) 생성 및 M1 학습 노트 추가
