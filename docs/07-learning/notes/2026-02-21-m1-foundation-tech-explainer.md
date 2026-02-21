# M1 기반 구축 기술 설명

- Date: 2026-02-21
- Source Skill: `study-tech-explainer`
- Related Scope: M1

## 1. 30초 요약

- 구현 목표: 기능 개발 이전에 인증/권한/DB/테스트 기반을 안정화한다.
- 핵심 기술: pnpm workspace, Next.js 16(App Router), Prisma+PostgreSQL, JWT+HttpOnly Cookie, Ownership Guard, Vitest/Playwright, Docker Compose.
- 결과: 로그인/학생 API/기본 대시보드/테스트 게이트가 동작하는 M1 기반 코드 확보.

## 2. 기술별 설명

### 2.1 pnpm Workspace

- 한 줄 정의: 여러 앱을 한 저장소에서 일관되게 의존성 관리하는 구조.
- 적용 지점: `/Users/mark/Documents/project/study-project/package.json`, `/Users/mark/Documents/project/study-project/pnpm-workspace.yaml`, `/Users/mark/Documents/project/study-project/pnpm-lock.yaml`
- 선택 이유: 현재 `apps/web` 중심으로 시작하되 추후 `apps/worker` 확장을 고려.
- 대안/트레이드오프: npm 단일 프로젝트는 단순하지만 멀티 앱 확장 시 관리 비용 증가.
- 흔한 실수: lockfile 미커밋으로 환경별 설치 결과 불일치.
- 체크: `pnpm install` 후 `pnpm -C apps/web lint` 실행.

### 2.2 Next.js 16 (App Router)

- 한 줄 정의: UI와 API를 같은 프레임워크에서 운영.
- 적용 지점: `/Users/mark/Documents/project/study-project/apps/web/src/app/layout.tsx`, `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/auth/login/route.ts`
- 선택 이유: MVP 속도와 코드 일관성.
- 대안/트레이드오프: React + 별도 API 서버 분리는 유연하지만 초기 개발 속도 저하.
- 흔한 실수: 서버/클라이언트 컴포넌트 경계 혼동.
- 체크: `pnpm -C apps/web dev` 후 `/login`, `/dashboard` 동작 확인.

### 2.3 Prisma + PostgreSQL

- 한 줄 정의: DB 구조를 코드로 정의하고 변경 이력을 migration으로 관리.
- 적용 지점: `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`, `/Users/mark/Documents/project/study-project/apps/web/prisma/migrations/00000000000000_init/migration.sql`, `/Users/mark/Documents/project/study-project/apps/web/prisma/seed.ts`
- 선택 이유: 타입 안전성과 재현 가능한 DB 변경 이력 확보.
- 대안/트레이드오프: raw SQL만 사용하면 자유도는 높지만 유지보수 부담 큼.
- 흔한 실수: schema 변경 후 migration 동기화 누락.
- 체크: `pnpm -C apps/web prisma:generate`, DB 환경에서 `prisma migrate deploy`.

### 2.4 JWT + HttpOnly Cookie

- 한 줄 정의: 로그인 성공 시 서버가 서명 토큰을 발급하고 쿠키로 유지.
- 적용 지점: `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/jwt.ts`, `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/auth/login/route.ts`
- 선택 이유: MVP에서 단순한 세션 관리 + 브라우저 JS 접근 차단(HttpOnly)로 토큰 노출 위험 감소.
- 대안/트레이드오프: Auth.js는 편의성이 높지만 초기 디버깅 복잡도 상승 가능.
- 흔한 실수: 토큰을 localStorage에 저장해 XSS 위험 증가.
- 체크: 로그인 후 `set-cookie` 헤더에 `HttpOnly` 포함 여부 확인.

### 2.5 Ownership Guard

- 한 줄 정의: 보호자-학생 소유권 검증을 서버에서 강제하는 권한 가드.
- 적용 지점: `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/ownership-guard.ts`, `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/students/route.ts`
- 선택 이유: IDOR(타인 studentId 접근) 위험 방지.
- 대안/트레이드오프: 클라이언트 필터링만 사용하면 구현은 쉽지만 보안적으로 취약.
- 흔한 실수: 요청의 `studentId`를 그대로 신뢰.
- 체크: 소유하지 않은 `studentId` 요청 시 `403` 반환 확인.

### 2.6 테스트 스택 (Vitest + Playwright)

- 한 줄 정의: 단위/통합/E2E 계층으로 품질 게이트를 구성.
- 적용 지점: `/Users/mark/Documents/project/study-project/apps/web/tests/unit/jwt.test.ts`, `/Users/mark/Documents/project/study-project/apps/web/tests/integration/students-route.test.ts`, `/Users/mark/Documents/project/study-project/apps/web/tests/e2e/login-dashboard.spec.ts`
- 선택 이유: 핵심 로직 회귀를 빠르게 감지하고 사용자 흐름까지 점검.
- 대안/트레이드오프: E2E만 사용하면 느리고 디버깅이 어려움.
- 흔한 실수: 통합 테스트 없이 mock 테스트만 수행.
- 체크: `pnpm -C apps/web test:unit && pnpm -C apps/web test:integration && pnpm -C apps/web test:e2e`.

### 2.7 Docker Compose (로컬 DB)

- 한 줄 정의: 로컬 PostgreSQL 실행 환경을 표준화.
- 적용 지점: `/Users/mark/Documents/project/study-project/infra/docker/docker-compose.local.yml`
- 선택 이유: 개발자별 DB 환경 차이 최소화.
- 대안/트레이드오프: 수동 설치는 초기 진입은 쉬울 수 있으나 환경 불일치 위험 증가.
- 흔한 실수: 포트/계정/DB 이름을 문서와 다르게 사용.
- 체크: `docker compose -f infra/docker/docker-compose.local.yml up -d` 후 healthcheck 확인.

## 3. 요청부터 동작까지 흐름 (로그인 → 학생조회)

1. 사용자가 `/login`에서 이메일/비밀번호 입력.
2. `/api/v1/auth/login`이 사용자 조회/비밀번호 검증 후 JWT 발급.
3. JWT를 HttpOnly 쿠키로 저장.
4. `/api/v1/students` 요청 시 쿠키 토큰 검증.
5. 서버가 `guardianUserId` 기준으로 본인 학생만 조회.
6. 특정 `studentId` 조회는 ownership guard로 재검증, 실패 시 403.

## 4. 학습 확인 질문

1. HttpOnly 쿠키를 쓰는 보안상 이유는 무엇인가?
2. Ownership Guard가 없으면 어떤 취약점이 발생하는가?
3. Prisma에서 schema와 migration을 같이 관리해야 하는 이유는 무엇인가?

## 5. 메모

- 확실한 사실: 위 설명은 M1 구현 파일을 기준으로 작성.
- 추론(검증 필요): 외부 배포 정책(TLS/접근제어)은 M2 이후 운영 환경에서 추가 검증 필요.
