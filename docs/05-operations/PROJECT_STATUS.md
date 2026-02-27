# Project Status

- Last Updated: 2026-02-27
- Current Phase: Build (M4 In Progress / Wave 3 Completed)
- Overall Progress: 98%

## 1. Milestone Status

| Milestone | Status | Progress | Owner | Notes |
| --- | --- | --- | --- | --- |
| M0 설계/문서화 | COMPLETED | 100% | Team | 권한/버전/데이터소스/운영정책 리스크 반영 완료 |
| M1 기반 구축 | COMPLETED | 100% | Team | Docker DB 런타임 검증 + 인증/학생 API/UI/테스트 게이트 완료 |
| M2 핵심 입력 기능 | COMPLETED | 100% | Team | 입력 API 8종 + 최소 UI 2화면 + 업로드/권한/테스트 게이트 완료 |
| M3 대시보드 MVP | COMPLETED | 100% | Team | overview/weakness/trends API + 대시보드 실사용 UI + 테스트 게이트 완료 |
| M4 검증/안정화 | IN_PROGRESS | 70% | Team | Wave 1~3 회귀 강화 완료(overview/trends + e2e 데이터 반영 경계 고정), 운영/UX 잔여 |

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
- [x] PostgreSQL 컨테이너 실제 기동 후 migrate/seed 런타임 검증
- [x] M2 입력 API 8종 구현(curriculum/materials/attempts/items/wrong-answers/categories/image)
- [x] 소유권 체인 검증 확장(material/attempt/attemptItem/wrongAnswer)
- [x] M2 최소 UI 2화면(`records/new`, `wrong-answers/manage`) 구현 및 보호 라우팅 연결
- [x] M2 Hybrid TDD 게이트 통과(lint/typecheck/unit/integration/e2e smoke)
- [x] M3 대시보드 API 3종 구현(`overview/weakness/trends`)
- [x] M3 계산 모듈 분리(`modules/analytics`, `modules/dashboard`) 및 규칙 고정
- [x] `/dashboard` 단일 화면 MVP 개편(필터/KPI/약점/유형/추이 SVG 차트)
- [x] M3 테스트 확장(unit/integration/e2e) 및 품질 게이트 통과
- [x] 대시보드 회귀 테스트 강화 완료(1차): fixture 추가 + unit/integration 실패 경로/날짜 경계 검증 확장
- [x] 대시보드 회귀 테스트 강화 완료(2차): overview/trends 계산 경계(기본 날짜/학기 전환/부분 주간 버킷/rangeEnd-only) 고정 검증
- [x] 대시보드 회귀 테스트 강화 완료(3차): records->wrong-answers->dashboard e2e 데이터 반영 시나리오를 fixture 기반으로 고정 검증

## 3. Risks and Blocks

- 현재 기능 구현 블로커 없음(M4 진행 중)
- 운영 모니터링: M3 지표의 교육적 해석 가이드(부모/학생용 설명 문구) 보강 필요
- 운영 모니터링: 외부 공개 시 TLS/접근제어 설정 점검
- 운영 모니터링: 로컬 업로드 스토리지 사용량/백업 정책 점검

## 4. Next Actions

1. M2 UX 백로그 처리: 오답 카테고리 선택형 UI(키 직접 입력 제거)를 적용한다.
2. 운영 체크리스트 보강: 로컬 업로드 백업/보관 주기와 알림 기준을 문서화한다.
3. M4 마무리: 회귀 테스트 세트를 PR/릴리즈 게이트 기준으로 확정한다.

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
- 2026-02-21: Docker DB 기동 + `prisma migrate deploy`/`prisma:seed` 런타임 검증 완료, M1 상태 COMPLETED로 전환
- 2026-02-21: Prisma config `.env` 로딩을 Node 내장 `process.loadEnvFile` 기반으로 정리
- 2026-02-21: M2 입력 API/보호 UI/소유권 체인/로컬 이미지 업로드 구현 완료
- 2026-02-21: M2 테스트 확장(통합 20케이스, e2e smoke 2시나리오) 및 품질 게이트 통과
- 2026-02-21: M3 대시보드 API/집계 모듈/UI 구현 완료(overview/weakness/trends + `/dashboard` MVP 개편)
- 2026-02-21: M3 테스트 확장(unit/integration/e2e 3시나리오) 및 품질 게이트 통과
- 2026-02-24: 세션 부트스트랩용 `/docs/CONTEXT_INDEX.md` 신설 및 `AGENTS.md`/`Handoff` 시작 체크리스트에 반영
- 2026-02-24: M4 회귀 강화 Wave 1 완료(대시보드 fixture 추가, unit/integration 경계/실패경로 테스트 확장, 품질 게이트 재검증)
- 2026-02-24: `study-code-cleanup` closeout 수행(리뷰 무결함 확인, 운영 문서 동기화, 커밋 준비 완료)
- 2026-02-27: M4 회귀 강화 Wave 2 완료(overview/trends 계산 경계 fixture 확장, unit/integration 테스트 보강, 전체 품질 게이트 재검증)
- 2026-02-27: M4 회귀 강화 Wave 3 완료(e2e fixture 기반 데이터 반영 시나리오 고정, 필터/쿼리 경계 검증, 전체 품질 게이트 재검증)
- 2026-02-27: `study-code-cleanup` closeout 수행(심각도 리뷰 무결함, 품질 게이트 재확인, 세션 종료 기록 반영)
