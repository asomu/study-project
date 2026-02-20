# Project Structure (Planned)

```text
/Users/mark/Documents/project/study-project
├─ apps/
│  ├─ web/                        # Next.js app (UI + API routes)
│  │  ├─ src/
│  │  │  ├─ app/                  # App Router
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ curriculum/
│  │  │  │  ├─ assessment/
│  │  │  │  ├─ mistake-note/
│  │  │  │  ├─ analytics/
│  │  │  │  └─ dashboard/
│  │  │  ├─ shared/
│  │  │  └─ styles/
│  │  ├─ prisma/
│  │  ├─ tests/
│  │  │  ├─ unit/
│  │  │  ├─ integration/
│  │  │  └─ e2e/
│  │  └─ package.json
│  └─ worker/                     # 선택: 비동기 분석/리포트
├─ infra/
│  ├─ docker/
│  │  ├─ docker-compose.local.yml
│  │  └─ docker-compose.prod.yml
│  ├─ caddy/
│  │  └─ Caddyfile
│  └─ scripts/
├─ docs/
│  ├─ README.md
│  ├─ INDEX.md
│  ├─ 01-product/
│  ├─ 02-architecture/
│  ├─ 03-process/
│  ├─ 04-quality/
│  ├─ 05-operations/
│  └─ 06-data/
└─ README.md
```

## 구조 원칙

- 기능 중심 모듈 구조를 유지
- 도메인 로직은 `modules/*/domain` 계층으로 분리
- 프레임워크 의존 코드는 `app` 또는 `infrastructure`에 제한
