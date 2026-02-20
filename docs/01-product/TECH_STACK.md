# Technical Stack Baseline

- Baseline Date: 2026-02-20

## 1. Application

- Language: TypeScript
- Frontend/Backend: Next.js 16 (App Router)
- UI: Tailwind CSS 4 + shadcn/ui
- Charts: Recharts
- Forms/Validation: React Hook Form + Zod

## 2. Data

- Primary DB: PostgreSQL
- ORM: Prisma
- Cache/Queue: Redis + BullMQ (비동기 분석 확장 시)
- Object Storage: MinIO (로컬 S3 호환)

## 3. Infra (Mac mini Local)

- Container runtime: Docker + Docker Compose
- Reverse proxy/TLS: Caddy
- Observability: OpenTelemetry + Loki/Grafana (단계적 도입)

## 4. Testing & Quality

- Unit/Integration: Vitest + Testing Library
- E2E: Playwright
- Lint/Format: ESLint + Prettier
- Type check: tsc --noEmit

## 5. 배포 전략

- 1단계: 로컬 네트워크 접근 중심
- 2단계: 외부 호스팅 이전 가능 구조
  - App/DB/Storage/Queue를 컨테이너 단위 분리
  - 환경변수 및 시크릿 분리 관리

## 6. 설계 원칙

- MVP는 모듈형 모놀리식으로 시작
- 데이터 모델은 초/중/고 + 과목 확장 고려
- 분석 로직은 서비스 계층에 캡슐화
