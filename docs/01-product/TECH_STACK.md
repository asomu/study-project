# Technical Stack Baseline

- Baseline Date: 2026-03-07

## 1. 현재 구현됨

### Application

- Language: TypeScript
- Frontend/Backend: Next.js 16 (App Router) + React 19
- UI: Tailwind CSS 4 + 커스텀 컴포넌트
- Client State/Data Fetching: React state/effect + browser `fetch`
- Validation: Zod
- Charts: 커스텀 SVG/CSS 차트

### Data

- Primary DB: PostgreSQL
- ORM: Prisma
- Upload Storage: 로컬 파일시스템(`public/uploads/wrong-answers`)

### Infra (Mac mini Local)

- Container runtime: Docker + Docker Compose
- Local DB runtime: `infra/docker/docker-compose.local.yml`의 PostgreSQL
- CI/CD: GitHub Actions 품질/릴리즈 게이트 + Mac mini 수동 배포

### Testing & Quality

- Unit: Vitest
- Route-contract tests: Vitest + mocked Prisma route tests
- Real integration tests: Vitest + Prisma + PostgreSQL
- Browser regression: Playwright mocked UI regression + real smoke
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
- 데이터 모델은 초/중/고 + 과목 확장을 고려한다.
- 분석 로직은 서비스 계층에 캡슐화하고, 캐시/배치는 실제 병목이 생길 때만 도입한다.
