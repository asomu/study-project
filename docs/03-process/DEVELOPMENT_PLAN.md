# Development Plan

- Plan Version: v1.0
- Start Baseline: 2026-02-20

## 1. Milestones

1. M0: 설계/문서화 완료
- 산출물: PRD, 아키텍처, 테스트/리뷰 전략, 상태관리 문서

2. M1: 기반 구축
- Next.js 프로젝트 초기화
- DB/Prisma/인증/기본 레이아웃

3. M2: 핵심 데이터 입력
- 문제집/학습지 입력
- 단원별 정오답 입력
- 오답 이미지 업로드 + 카테고리 분류

4. M3: 대시보드 MVP
- 진도 대비 성취도
- 단원별 약점 시각화
- 오답 유형 분포

5. M4: 검증/안정화
- 테스트 강화
- 로컬 배포 안정화
- 사용자 피드백 반영

## 1.1 M1 Scope Lock (2026-02-20)

포함 범위:

- pnpm 워크스페이스 + Next.js 16(App Router) + Tailwind 4 + ESLint/Prettier
- PostgreSQL 대상 Prisma 스키마/마이그레이션/시드 파일
- 커스텀 JWT + HttpOnly 쿠키 기반 인증(`POST /api/v1/auth/login`, `POST /api/v1/auth/logout`)
- 학생 기본 API(`GET /api/v1/students`, `POST /api/v1/students`) + 소유권 가드 스캐폴딩
- 기본 로그인/대시보드 셸 화면과 보호 라우팅
- Unit/Integration/E2E smoke 테스트 게이트

비포함 범위:

- Redis/BullMQ, MinIO, Caddy 운영 구성
- 오답 이미지 업로드 API 및 대시보드 분석 API 구현
- M2 이후 도메인(문제집/시도/오답 입력) 기능 상세

## 1.2 M2 Scope Lock (2026-02-21)

포함 범위:

- 입력 API 구현
  - `GET /api/v1/curriculum`
  - `POST /api/v1/materials`
  - `POST /api/v1/attempts`
  - `POST /api/v1/attempts/{attemptId}/items`
  - `POST /api/v1/wrong-answers`
  - `GET /api/v1/wrong-answers`
  - `PUT /api/v1/wrong-answers/{id}/categories`
  - `POST /api/v1/wrong-answers/{id}/image`
- 소유권 체인 검증 확장(`material/attempt/attemptItem/wrongAnswer`)
- 최소 UI 2화면(`records/new`, `wrong-answers/manage`) + 보호 라우팅 연결
- 로컬 파일 업로드 정책 적용(`public/uploads/wrong-answers`, 최대 5MB, jpeg/png/webp)
- Hybrid TDD 게이트 확장(unit/integration/e2e smoke)

비포함 범위:

- Redis/MinIO/Caddy 운영 구성
- 대시보드 분석 API(`overview/weakness/trends`) 본 구현
- OCR/자동채점/다과목 확장

## 1.3 M3 Scope Lock (2026-02-21)

포함 범위:

- 대시보드 API 구현
  - `GET /api/v1/dashboard/overview`
  - `GET /api/v1/dashboard/weakness`
  - `GET /api/v1/dashboard/trends`
- `/dashboard` 단일 화면을 실사용 가능한 MVP 수준으로 개편
  - 필터(학생/기준일/기간), KPI 카드, 약점 리스트, 오답 유형 분포, 주간 추이 차트
  - 차트는 외부 라이브러리 없이 SVG/CSS로 구현
- 집계 데이터 소스는 `attempt_items` 직접 집계로 고정
- 트렌드는 최근 4주(28일) 주 단위(월요일 시작) 기준으로 제공
- 약점 랭킹은 `정답률 오름차순 + 최소 시도수 3회 + 상위 5개` 규칙 적용
- Hybrid TDD 확장
  - Unit(계산 규칙), Integration(API 계약/권한/검증), E2E(입력->대시보드 반영 + 학생 전환/빈상태)

비포함 범위:

- 대시보드 상세 분리 화면
- 차트 라이브러리 도입
- AI 추천/고급 분석 로직
- M2 오답 카테고리 UX 전면 개편

## 2. MVP 작업 우선순위

- P0: 인증/학생 프로필/커리큘럼
- P0: 시도/문항/오답 저장
- P0: 대시보드 핵심 3개 차트
- P1: 리포트/추천 메시지
- P2: 고급 분석/자동화

## 3. 리스크

- 한국 수학 진도 데이터 버전 동기화 필요
- 권한/소유권 검증 누락 시 데이터 노출 위험
- 모바일 UX 복잡도 증가 가능

## 4. 대응

- asOfDate 기반 커리큘럼 버전 관리
- 보호자-학생 소유권 검증 규칙을 API 공통 가드로 강제
- 카테고리 가이드 문구 통일
- 모바일 우선 디자인 리뷰 주기 고정
