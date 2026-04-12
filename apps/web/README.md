# Web App

Next.js 16(App Router) 기반 초등/중등 수학 오답노트 + 문제집 진도 애플리케이션입니다.

- 보호자: `/signup` -> `/dashboard`
- 학생: 보호자 초대코드로 `/student/activate` -> `/student/dashboard`

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
- 이 계정은 보호자 seed 계정이며, 학생 로그인 계정은 기본으로 생성되지 않습니다.

## Demo Commands

데모용 샘플 데이터를 기본 seed와 분리해서 주입할 수 있습니다.

```bash
pnpm -C apps/web demo:seed
pnpm -C apps/web demo:clear
pnpm -C apps/web demo:activate-student
```

- `demo:seed`는 current WrongNote + Workbook 데모 데이터를 다시 채웁니다.
- `demo:clear`는 같은 current demo wrong-note/workbook 데이터와 관련 이미지 파일만 정리합니다.
- `demo:activate-student`는 데모 학생 로그인 계정을 바로 준비하거나 기존 계정을 같은 자격 증명으로 갱신합니다.
- `DEMO_REFERENCE_DATE=YYYY-MM-DD pnpm -C apps/web demo:seed`로 기준일을 고정할 수 있습니다.
- 기본 데모 학생 자격 증명은 `.env.example`의 `DEMO_STUDENT_*` 값이며, 운영자용 시연 절차는 `/Users/mark/Documents/project/study-project/docs/05-operations/DEMO_RUNBOOK.md`를 따릅니다.

## Current Product Guides

- 사용자 가이드: `/Users/mark/Documents/project/study-project/docs/05-operations/USER_GUIDE.md`
- 수동 QA 체크리스트: `/Users/mark/Documents/project/study-project/docs/04-quality/USER_E2E_MANUAL_CHECKLIST.md`
- 데모 런북: `/Users/mark/Documents/project/study-project/docs/05-operations/DEMO_RUNBOOK.md`

## LAN Demo Start

같은 공유기 내부 네트워크에서 임시 데모를 열 때는 개발 서버 대신 production start를 사용합니다.

```bash
pnpm -C apps/web build
pnpm -C apps/web start:lan
```

- 공유 주소 형식: `http://<LAN_IP>:3000/login`
- 이 앱은 Next.js + API + Prisma 구조라 VS Code `Live Server` 같은 정적 서버 확장으로는 동작하지 않습니다.
- 운영자용 시연 절차는 `/Users/mark/Documents/project/study-project/docs/05-operations/DEMO_RUNBOOK.md`를 기준으로 합니다.

## Quality Gate Commands

```bash
pnpm -C apps/web lint
pnpm -C apps/web typecheck
pnpm -C apps/web build
pnpm -C apps/web test:unit
pnpm -C apps/web test:route-contract
pnpm -C apps/web test:integration:real
pnpm -C apps/web test:integration
pnpm -C apps/web test:e2e:mocked
pnpm -C apps/web test:e2e:real
pnpm -C apps/web test:e2e
```

## Notes

- `POST /api/v1/auth/login`의 `accessToken` 응답 필드는 v1 호환성 때문에 유지되지만, 웹 클라이언트는 HttpOnly 쿠키만 사용합니다.
- `pnpm test:integration:real`과 `pnpm test:e2e:real`은 PostgreSQL + migration/seed가 준비된 상태를 전제로 합니다.
