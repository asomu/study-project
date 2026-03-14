# Project Structure (Current Baseline)

```text
/Users/mark/Documents/project/study-project
├─ .github/
│  └─ workflows/
│     ├─ quality.yml              # PR/push quality gate
│     └─ release-gate.yml         # Manual release gate
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
│  │  │  ├─ integration/          # mocked route-contract tests
│  │  │  ├─ real-integration/     # Prisma + PostgreSQL real integration tests
│  │  │  └─ e2e/                  # mocked UI regression + real smoke
│  │  └─ package.json
├─ infra/
│  ├─ docker/
│  │  ├─ docker-compose.local.yml
│  └─ (deferred)/                 # prod compose / proxy 등은 후속 도입 후보
├─ backups/
│  └─ wrong-answers/
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
- 도메인 로직은 `modules/*`에 모듈 단위로 유지하고, 과도한 계층 증설은 피한다.
- 프레임워크 의존 코드는 `app` 또는 `infrastructure`에 제한
- 테스트는 `unit` / `route-contract` / `real-integration` / `e2e`로 역할을 분리한다.
- 실제로 존재하지 않는 worker/proxy/storage 구조는 문서에 future candidate로만 표기한다.
