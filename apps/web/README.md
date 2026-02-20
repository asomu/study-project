# Web App (M1 Foundation)

Next.js 16(App Router) 기반 M1 코어 애플리케이션입니다.

## Quick Start

1. 의존성 설치

```bash
pnpm install
```

2. 환경 변수 준비

```bash
cp apps/web/.env.example apps/web/.env
```

3. PostgreSQL 실행(Docker 사용 시)

```bash
docker compose -f infra/docker/docker-compose.local.yml up -d
```

4. Prisma 마이그레이션 + 시드

```bash
pnpm -C apps/web prisma:generate
pnpm -C apps/web prisma migrate deploy
pnpm -C apps/web prisma:seed
```

5. 개발 서버 실행

```bash
pnpm -C apps/web dev
```

## Default Seed Account

- email: `guardian@example.com`
- password: `Guardian123!`

## Quality Gate Commands

```bash
pnpm -C apps/web lint
pnpm -C apps/web typecheck
pnpm -C apps/web test:unit
pnpm -C apps/web test:integration
pnpm -C apps/web test:e2e
```
