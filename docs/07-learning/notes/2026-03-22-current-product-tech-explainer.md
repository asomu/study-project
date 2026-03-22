# 현재 제품 구현 기술 설명

- Date: 2026-03-22
- Source Skill: `study-tech-explainer`
- Related Scope: M1~M10 현재 제품 기준

## 1. 30초 요약 (Level 1)

- 구현 목표: 학생과 보호자가 같은 데이터로 오답노트와 문제집 진도를 관리하는 서비스를 안정적으로 운영한다.
- 핵심 기술: `pnpm workspace`, Next.js 16 App Router, Prisma + PostgreSQL, JWT + HttpOnly Cookie, Ownership Guard, Wrong Note 전용 스토리지, Workbook 전용 도메인, Hybrid TDD.
- 결과: `/student/dashboard`와 `/dashboard`가 하나의 인증/권한/DB 규칙 위에서 동작하고, 오답 이미지와 진도 상태가 같은 제품 경험으로 연결된다.

## 2. 기술별 설명

### 2.1 `pnpm workspace` + 단일 저장소 시작점

- 한 줄 정의: 여러 앱과 스크립트를 한 저장소에서 같은 의존성 규칙으로 관리하는 구조다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/package.json`
  - `/Users/mark/Documents/project/study-project/pnpm-workspace.yaml`
  - `/Users/mark/Documents/project/study-project/apps/web/package.json`
- 왜 이걸 선택했는가:
  - M1에서 빠르게 시작하되, 나중에 `apps/worker` 같은 확장 여지를 남기기 위해서다.
  - 실제로 루트 스크립트가 `apps/web` 명령을 위임하고 있어, 지금은 단일 앱처럼 쓰되 구조는 확장 가능하게 잡아두었다.
- 대안과 트레이드오프:
  - 대안: `apps/web`만 있는 단일 npm 프로젝트.
  - 트레이드오프: 처음은 더 단순하지만, 앱/스크립트가 늘면 lockfile과 실행 표준을 다시 정리해야 한다.
- 실무에서 자주 하는 실수:
  - 루트와 앱 디렉터리 명령을 섞어 써서 "왜 여기서는 되고 저기서는 안 되지?" 상태가 생긴다.
  - lockfile을 가볍게 보고 커밋하지 않아 팀마다 설치 결과가 달라진다.
- 바로 해볼 체크:
  - `pnpm verify:pr`
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web typecheck`

### 2.2 Next.js 16 App Router

- 한 줄 정의: 화면과 API를 같은 프레임워크 안에서 함께 운영하는 웹 애플리케이션 구조다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/layout.tsx`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/auth/login/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/wrong-notes/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/workbook-progress/dashboard/route.ts`
- 왜 이걸 선택했는가:
  - `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` ADR-0001, ADR-0014 기준으로 지금 프로젝트는 "모듈형 모놀리식 + lean stack"이 목표다.
  - 학생/보호자 대시보드, 로그인, API를 한 코드베이스에서 움직이면 MVP 속도와 추적성이 좋다.
- 대안과 트레이드오프:
  - 대안: React 프론트엔드 + 별도 Express/Nest API 서버.
  - 트레이드오프: 분리는 더 유연하지만, 지금 단계에서는 인증/배포/로컬 개발 복잡도가 커진다.
- 실무에서 자주 하는 실수:
  - 서버 컴포넌트와 클라이언트 컴포넌트 경계를 흐리게 만들어 데이터 흐름을 헷갈린다.
  - route handler에 계산/검증/DB 로직을 너무 많이 넣어 서비스 계층이 약해진다.
- 바로 해볼 체크:
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web dev`
  - `/login`, `/student/dashboard`, `/dashboard`가 모두 열리는지 확인한다.

### 2.3 Prisma + PostgreSQL + migration/seed

- 한 줄 정의: DB 구조를 코드로 정의하고, 변경 이력과 초기 데이터를 재현 가능한 방식으로 관리하는 조합이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/migrations/20260322010448_workbook_progress/migration.sql`
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/seed.ts`
  - `/Users/mark/Documents/project/study-project/infra/docker/docker-compose.local.yml`
- 왜 이걸 선택했는가:
  - 현재 제품은 `users`, `students`, `wrong_notes`, `workbook_templates`, `student_workbook_progress`처럼 연결 관계가 많다.
  - `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md`와 `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md`의 요구를 보면, 권한/연결/히스토리를 코드로 안전하게 표현해야 해서 Prisma가 잘 맞는다.
- 대안과 트레이드오프:
  - 대안: raw SQL 중심 운영 또는 다른 ORM.
  - 트레이드오프: raw SQL은 자유도는 높지만, 타입 연결과 관계 추적을 직접 더 많이 관리해야 한다.
- 실무에서 자주 하는 실수:
  - `schema.prisma`만 바꾸고 migration/seed/test를 같이 안 맞춰서 "문서는 최신인데 DB는 옛날 상태"가 된다.
  - 실제 운영 모델과 테스트 seed가 어긋나서 integration 테스트가 의미를 잃는다.
- 바로 해볼 체크:
  - `docker compose -f /Users/mark/Documents/project/study-project/infra/docker/docker-compose.local.yml up -d`
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web prisma migrate deploy`
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web prisma:seed`

### 2.4 JWT + HttpOnly Cookie + 로그인 식별자 레지스트리

- 한 줄 정의: 로그인 성공 시 서명된 토큰을 쿠키에 저장하고, 로그인 식별자는 별도 레지스트리 테이블로 찾는 방식이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/auth/login/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/jwt.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/auth-response.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/account-service.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
- 왜 이걸 선택했는가:
  - `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` ADR-0008은 M1 인증을 "커스텀 JWT + HttpOnly Cookie"로 고정했다.
  - ADR-0016은 `email`과 `loginId` 충돌을 DB 레벨에서 막기 위해 `user_credential_identifiers`를 두었다. 즉, 단순 로그인 기능이 아니라 "식별자 충돌 없는 계정 모델"까지 같이 구현한 것이다.
- 대안과 트레이드오프:
  - 대안: Auth.js 같은 인증 프레임워크, 또는 서버 세션 저장소.
  - 트레이드오프: 프레임워크 편의는 크지만, 이 프로젝트처럼 guardian/student 연결 규칙이 강한 모델에서는 커스텀 규칙 이해가 더 중요할 수 있다.
- 실무에서 자주 하는 실수:
  - 토큰을 `localStorage`에 저장해 XSS 노출 면적을 키운다.
  - `email`과 `loginId`를 별개로 취급하다가 충돌 계정을 만든다.
  - 학생 계정인데 연결된 `studentProfile`이 없을 때 예외 흐름을 빼먹는다.
- 바로 해볼 체크:
  - 로그인 후 응답의 `set-cookie`에 `HttpOnly`, `SameSite=Lax`, `Path=/`가 포함되는지 확인한다.
  - `/Users/mark/Documents/project/study-project/apps/web/tests/integration/auth-login-route.test.ts`를 읽고 실패 케이스가 어떻게 막히는지 확인한다.

### 2.5 Ownership Guard + 학생 프로필 linkage

- 한 줄 정의: "로그인했는가?"만 보지 않고 "이 데이터가 정말 내 학생 것인가?"를 서버에서 다시 확인하는 권한 경계다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/ownership-guard.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/session.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/wrong-notes/[id]/image/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/wrong-notes/[id]/image/route.ts`
- 왜 이걸 선택했는가:
  - `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` ADR-0004는 MVP의 핵심 보안 규칙을 "보호자-학생 소유권 체인 검증"으로 고정했다.
  - PRD의 FR-002, FR-009를 보면, 학생/보호자 모두 자기 범위 데이터만 접근해야 한다. 그래서 role 검사만으로는 부족하고 ownership 검증이 별도 계층으로 필요하다.
- 대안과 트레이드오프:
  - 대안: 미들웨어에서 role만 검사하고 route 내부에서는 `studentId`를 그대로 신뢰한다.
  - 트레이드오프: 구현은 쉬워지지만, 가장 위험한 IDOR 문제가 바로 생긴다.
- 실무에서 자주 하는 실수:
  - 인증과 인가를 같은 것으로 생각한다.
  - 학생 로그인인데 `loginUserId -> Student` 연결 검증을 빼먹는다.
  - 보호자 요청에서 `studentId` 쿼리 파라미터를 그대로 믿는다.
- 바로 해볼 체크:
  - 소유하지 않은 `studentId`로 보호자 API를 호출했을 때 `403`이 나는지 확인한다.
  - `/Users/mark/Documents/project/study-project/apps/web/tests/integration/wrong-notes-routes.test.ts`에서 guardian/student 경계 케이스를 읽어본다.

### 2.6 Wrong Note 전용 도메인 + repo 밖 스토리지 + guarded image API

- 한 줄 정의: 사진 업로드형 오답노트를 전용 엔티티로 분리하고, 이미지는 git repo 밖에 저장한 뒤 권한 검사 API로만 보여주는 구조다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/wrong-note/service.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/mistake-note/upload.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/wrong-notes/[id]/image/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/wrong-notes/[id]/image/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/scripts/wrong-note-storage-audit.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/scripts/wrong-note-storage-backup.ts`
- 왜 이걸 선택했는가:
  - ADR-0022는 현재 제품의 오답 소스 오브 트루스를 `WrongNote`로 분리한다고 명시한다.
  - ADR-0025는 실제 학생 이미지를 repo 안 `public`에 두지 않고 `~/Library/Application Support/study-project/wrong-notes`로 분리하라고 고정한다.
  - 이유는 두 가지다. 첫째, 배포/브랜치 이동/정리 작업이 사용자 파일을 건드리면 안 된다. 둘째, 이미지도 학생 데이터이므로 정적 공개 링크보다 ownership 검증이 중요하다.
- 대안과 트레이드오프:
  - 대안 1: 기존 `WrongAnswer` 구조를 계속 확장한다.
  - 대안 2: `public/uploads/...` 정적 파일 방식으로 계속 간다.
  - 트레이드오프: 기존 구조 재사용은 빠를 수 있지만, 현재 "사진 1장 중심 오답노트" UX와 권한/통계 모델이 더 복잡해진다. 정적 공개 방식은 간단하지만 보안과 운영 안정성이 약하다.
- 실무에서 자주 하는 실수:
  - DB에 공개 URL을 저장해 나중에 스토리지 전략을 못 바꾸는 것.
  - MIME만 검사하고 실제 파일 시그니처는 확인하지 않는 것.
  - repo 정리 작업과 사용자 업로드 데이터를 같은 디렉터리에서 관리하는 것.
- 바로 해볼 체크:
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web run wrong-note:storage:audit -- --json`
  - 학생으로 오답 이미지를 업로드한 뒤, 응답 `imagePath`가 정적 파일 경로가 아니라 `/api/v1/student/wrong-notes/{id}/image` 형태인지 확인한다.

### 2.7 Workbook 전용 도메인 + matrix 진도 계산

- 한 줄 정의: 문제집 템플릿, 학생 배정, 단원 x 단계 진도를 기존 학습 진도 모델과 분리한 별도 도메인이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/workbook/service.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/unit/workbook-service.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/integration/workbook-routes.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/real-integration/workbook-progress-real.test.ts`
- 왜 이걸 선택했는가:
  - ADR-0027은 workbook progress를 legacy `student_unit_progress`에 억지로 넣지 않고, `WorkbookTemplate`, `StudentWorkbook`, `StudentWorkbookProgress`로 분리한다고 고정했다.
  - 실제 제품 요구는 "보호자가 직접 문제집 구조를 만들고, 학생과 보호자가 같은 matrix를 본다"이므로, 기존 study session 기반 진도 모델과 목적이 다르다.
- 대안과 트레이드오프:
  - 대안: 기존 `student_unit_progress`를 재사용한다.
  - 트레이드오프: 데이터 수는 줄겠지만, 단계(stage) 구조와 문제집 템플릿 개념을 자연스럽게 담기 어렵다.
- 실무에서 자주 하는 실수:
  - sparse row만 저장해놓고 UI에서 "없는 셀"을 처리하지 않아 matrix가 깨진다.
  - 단계 이름 중복과 정렬 규칙을 느슨하게 두어 템플릿이 금방 어지러워진다.
  - 이미 학생에게 배정된 템플릿의 단계 구조를 수정해서 과거 진도 데이터 의미를 깨뜨린다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/tests/unit/workbook-service.test.ts`에서 `not_started` 기본값과 요약 계산을 읽어본다.
  - 보호자 템플릿 생성 -> 학생 배정 -> 학생 상태 변경 -> 보호자 대시보드 반영 흐름을 `/Users/mark/Documents/project/study-project/apps/web/tests/real-integration/workbook-progress-real.test.ts`에서 따라가본다.

### 2.8 Hybrid TDD + verification gates

- 한 줄 정의: 계산 로직, API 계약, 실DB 흐름, 브라우저 사용자 시나리오를 서로 다른 레벨 테스트로 나눠 검증하는 전략이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/docs/04-quality/TEST_AND_VALIDATION.md`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/unit/wrong-note-service.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/integration/wrong-notes-routes.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/real-integration/workbook-progress-real.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/e2e/wrong-note-dashboard.spec.ts`
  - `/Users/mark/Documents/project/study-project/scripts/run-verification-gates.sh`
- 왜 이걸 선택했는가:
  - ADR-0003과 ADR-0013은 이 프로젝트의 품질 기준을 Hybrid TDD와 `verify:pr` / `verify:release` 두 단계 게이트로 고정한다.
  - 이 서비스는 "권한 + DB + 파일 업로드 + UI 상호작용"이 동시에 엮여 있어서, 한 종류 테스트만으로는 회귀를 막기 어렵다.
- 대안과 트레이드오프:
  - 대안 1: e2e 위주로만 검증한다.
  - 대안 2: unit 위주로만 검증한다.
  - 트레이드오프: e2e만 하면 느리고 원인 파악이 어렵고, unit만 하면 실제 권한/업로드 흐름이 비어버린다.
- 실무에서 자주 하는 실수:
  - mocked 테스트만 통과시키고 real DB 흐름을 확인하지 않는다.
  - `401/403/404/409` 같은 실패 경로를 빼먹는다.
  - 테스트 이름은 많은데 PR 게이트 명령이 정리되어 있지 않아 팀이 매번 다르게 돌린다.
- 바로 해볼 체크:
  - `pnpm verify:pr`
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web test:e2e:mocked`

## 3. 요청부터 동작까지 흐름 (Level 2)

1. 로그인:
  - 사용자가 `/login`에서 식별자와 비밀번호를 보낸다.
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/auth/login/route.ts`가 `resolveUserByIdentifier`로 계정을 찾고, 비밀번호를 검증한 뒤 JWT를 발급한다.
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/auth-response.ts`가 JWT를 HttpOnly Cookie로 내려준다.

2. 세션 확인과 권한 경계:
  - 이후 API 요청은 `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/session.ts`가 쿠키에서 토큰을 읽는다.
  - 보호자 요청은 `assertStudentOwnership`, 학생 요청은 `assertStudentLoginOwnership`으로 다시 검증한다.

3. 학생 오답 업로드:
  - 학생이 `/student/dashboard`에서 사진, 대상 학년, 학기, 단원, 오류유형을 선택해 업로드한다.
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/wrong-notes/route.ts`가 입력값과 커리큘럼 범위를 검증한다.
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/mistake-note/upload.ts`가 MIME, 시그니처, 용량을 확인하고 repo 밖 저장소에 파일을 저장한다.
  - DB에는 공개 URL이 아니라 storage key가 저장되고, 응답에는 guarded image API URL이 들어간다.

4. 문제집 진도 반영:
  - 학생/보호자는 workbook progress API로 특정 단원 x 단계 상태를 바꾼다.
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/workbook/service.ts`는 실제 저장된 row가 없어도 `not_started`로 matrix를 채운다.
  - 그래서 UI는 "없는 데이터"를 빈칸으로 두지 않고, 전체 구조를 안정적으로 렌더링할 수 있다.

5. 이미지 조회:
  - 학생 또는 보호자가 오답 상세를 열면, 브라우저는 `/api/v1/student/wrong-notes/{id}/image` 또는 `/api/v1/wrong-notes/{id}/image?studentId=...`를 호출한다.
  - 이 라우트는 ownership를 한 번 더 확인한 뒤 파일을 읽어 private response로 반환한다.

심화 포인트(Level 3, 원하면 더 설명 가능):

- 왜 `imagePath`에는 공개 경로가 아니라 storage key를 저장하는가
- 왜 `StudentWorkbookProgress`는 `studentWorkbookId + curriculumNodeId + workbookTemplateStageId` 복합 unique를 가지는가
- 왜 학생 로그인도 결국 `loginUserId -> Student` 연결 확인을 다시 해야 하는가

## 4. 학습 확인 질문

1. 이 프로젝트에서 "인증"과 "소유권 검증"은 왜 다른 문제일까요?
2. `WrongNote` 이미지를 `public/uploads`에 두지 않고 guarded API로 읽는 이유를 한 문장으로 설명해볼 수 있나요?
3. workbook progress matrix에서 저장 레코드가 없는 셀을 `not_started`로 해석하는 이유는 무엇일까요?

## 5. 메모

- 확실한 사실:
  - 현재 학습 문서 인덱스에는 M1, M3, M6 설명만 있었고, 현재 제품의 핵심인 `WrongNote`/`Workbook`/storage hardening 설명은 별도 정리가 필요했다.
  - 위 설명은 2026-03-22 기준 현재 구현 파일과 `PRD`, `DECISION_LOG`, `PROJECT_STATUS`, `TEST_AND_VALIDATION` 문서를 함께 대조해 작성했다.
- 추론(검증 필요):
  - 학생 수와 업로드량이 크게 늘어나면, 나중에는 object storage나 background worker가 필요할 가능성이 높다. 다만 현재 문서 기준으로는 아직 deferred candidate다.
