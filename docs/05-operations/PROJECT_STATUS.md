# Project Status

- Last Updated: 2026-02-21
- Current Phase: Build (M3 Ready)
- Overall Progress: 82%

## 1. Milestone Status

| Milestone | Status | Progress | Owner | Notes |
| --- | --- | --- | --- | --- |
| M0 설계/문서화 | COMPLETED | 100% | Team | 권한/버전/데이터소스/운영정책 리스크 반영 완료 |
| M1 기반 구축 | COMPLETED | 100% | Team | Docker DB 런타임 검증 + 인증/학생 API/UI/테스트 게이트 완료 |
| M2 핵심 입력 기능 | COMPLETED | 100% | Team | 입력 API 8종 + 최소 UI 2화면 + 업로드/권한/테스트 게이트 완료 |
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
- [x] PostgreSQL 컨테이너 실제 기동 후 migrate/seed 런타임 검증
- [x] M2 입력 API 8종 구현(curriculum/materials/attempts/items/wrong-answers/categories/image)
- [x] 소유권 체인 검증 확장(material/attempt/attemptItem/wrongAnswer)
- [x] M2 최소 UI 2화면(`records/new`, `wrong-answers/manage`) 구현 및 보호 라우팅 연결
- [x] M2 Hybrid TDD 게이트 통과(lint/typecheck/unit/integration/e2e smoke)

## 3. Risks and Blocks

- 현재 기능 구현 블로커 없음(M2 종료)
- 운영 모니터링: 디자인 산출물 품질(Figma 노드/레퍼런스 확보 여부)
- 운영 모니터링: 외부 공개 시 TLS/접근제어 설정 점검
- 운영 모니터링: 로컬 업로드 스토리지 사용량/백업 정책 점검

## 4. Next Actions

1. M3 범위 확정: 대시보드 핵심 API(`overview/weakness/trends`) 계약과 계산 규칙 고정
2. M3 시각화 구현: 진도/약점/오답유형 카드 및 차트 기본 UI 연결
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
- 2026-02-21: Docker DB 기동 + `prisma migrate deploy`/`prisma:seed` 런타임 검증 완료, M1 상태 COMPLETED로 전환
- 2026-02-21: Prisma config `.env` 로딩을 Node 내장 `process.loadEnvFile` 기반으로 정리
- 2026-02-21: M2 입력 API/보호 UI/소유권 체인/로컬 이미지 업로드 구현 완료
- 2026-02-21: M2 테스트 확장(통합 20케이스, e2e smoke 2시나리오) 및 품질 게이트 통과
