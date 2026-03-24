# Technical Stack Baseline

- Baseline Date: 2026-03-23

## 1. 현재 구현됨

### Application

- Language: TypeScript
- Monorepo baseline: `pnpm workspace` 단일 저장소 + 현재 앱 엔트리 `apps/web`
- Frontend/Backend: Next.js 16 (App Router) + React 19
- UI: Tailwind CSS 4 + 커스텀 컴포넌트 + 커스텀 SVG/CSS 차트
- Auth: 커스텀 JWT + HttpOnly Cookie + `user_credential_identifiers` 기반 로그인 식별자 조회
- Client State/Data Fetching: React state/effect + browser `fetch` + App Router route handlers
- Validation: Zod

### Domain Modules

- Wrong Note: `WrongNote` 전용 도메인 + 학생/보호자 전용 route handlers + guarded image API
- Workbook Progress: `WorkbookTemplate` / `StudentWorkbook` / `StudentWorkbookProgress` 전용 도메인
- Legacy posture: `attempt` / `wrong-answer` / `study` 런타임과 API는 제거했고, 이번 배치에서는 Prisma legacy 테이블만 dormant 상태로 유지한다.

### Data

- Primary DB: PostgreSQL
- ORM: Prisma
- Schema lifecycle: Prisma migrate + seed
- Upload Storage
  - Wrong Note 이미지: `~/Library/Application Support/study-project/wrong-notes`
  - Wrong Note backup archive: `~/Library/Application Support/study-project-backups`

### Infra (Mac mini Local)

- Container runtime: Docker + Docker Compose
- Local DB runtime: `infra/docker/docker-compose.local.yml`의 PostgreSQL
- Local operations: wrong-note storage audit / backup 스크립트 운영
- CI/CD: GitHub Actions 품질/릴리즈 게이트 + Mac mini 수동 배포

### Testing & Quality

- Unit: Vitest
- Route-contract tests: Vitest + mocked Prisma route tests
- Real integration tests: Vitest + Prisma + PostgreSQL
- Browser regression: Playwright mocked UI regression + real smoke
- Verification commands: `pnpm verify:pr`, `pnpm verify:release`
- Lint/Format: ESLint + Prettier
- Type check: `tsc --noEmit`

## 2. 후속 도입 후보 (현재 미적용)

- UI toolkit: `shadcn/ui`
- Form library: React Hook Form
- Chart library: Recharts
- Cache/Queue: Redis + BullMQ
- Object Storage: MinIO
- Reverse proxy/TLS: Caddy
- Observability: OpenTelemetry + Loki/Grafana
- Worker app / production compose 분리

## 3. 배포 전략

- 1단계: Mac mini 로컬/self-hosted + 수동 배포
- 2단계: 외부 공개 필요 시 reverse proxy/TLS/접근제어를 추가한다.
- 3단계: 실제 병목이 확인되면 queue/object storage/worker를 순차 도입한다.

## 4. 설계 원칙

- 릴리즈 하드닝 단계에서는 실제 구현된 lean stack을 기준 문서로 유지한다.
- MVP는 모듈형 모놀리식으로 유지한다.
- 현재 제품의 핵심 데이터 경계는 `WrongNote` + `Workbook` 중심으로 유지한다.
- Wrong Note 업로드 데이터는 git repo 밖 앱 데이터 루트에 두고, 브라우저에는 ownership 검증을 거친 API로만 노출한다.
- 레거시 page URL은 redirect shim만 유지하고, legacy API/runtime은 다시 추가하지 않는다.
- 분석 로직은 서비스 계층에 캡슐화하고, 캐시/배치는 실제 병목이 생길 때만 도입한다.
- 데이터 모델은 초/중/고 + 과목 확장을 고려한다.
