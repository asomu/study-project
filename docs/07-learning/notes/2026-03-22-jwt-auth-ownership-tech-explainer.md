# JWT + 권한 흐름 기술 설명

- Date: 2026-03-22
- Source Skill: `study-tech-explainer`
- Related Scope: M1 인증 기반 + 현재 학생/보호자 계정 모델

## 1. 30초 요약 (Level 1)

- 구현 목표: 보호자와 학생이 서로 다른 방식으로 로그인하되, 같은 서비스 안에서 안전하게 자기 데이터만 보게 만든다.
- 핵심 기술: guardian signup, student activate, `user_credential_identifiers`, JWT, HttpOnly Cookie, session parser, Ownership Guard.
- 결과: 로그인 성공만으로 끝나지 않고, API마다 "이 학생 데이터가 정말 내 것인가"를 다시 검증하는 구조가 완성되었다.

## 2. 기술별 설명

### 2.1 보호자 가입 + 학생 활성화 모델

- 한 줄 정의: 보호자는 직접 가입하고, 학생은 초대코드로 활성화해 `Student.loginUserId`에 연결하는 계정 구조다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/auth/signup/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/auth/student-activate/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/account-service.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
- 왜 이걸 선택했는가:
  - `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md` ADR-0015는 실제 사용 단계에서 guardian/student의 진입점과 권한을 분리해야 한다고 정리한다.
  - 학생 이메일을 강제하지 않고도 보호자가 학생 계정을 안전하게 연결할 수 있어야 했기 때문이다.
- 대안과 트레이드오프:
  - 대안: 학생도 이메일 기반으로 독립 가입한다.
  - 트레이드오프: 구현은 익숙하지만, 중학생 계정 관리와 보호자 연결이 더 복잡해진다.
- 실무에서 자주 하는 실수:
  - 초대코드 사용/만료/중복 활성화 체크를 빼먹는다.
  - 학생 계정 생성과 `Student.loginUserId` 연결을 한 트랜잭션으로 묶지 않는다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/tests/integration/auth-signup-route.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/integration/auth-student-activate-route.test.ts`

### 2.2 `user_credential_identifiers` 기반 식별자 조회

- 한 줄 정의: 로그인할 때 `email`과 `loginId`를 직접 뒤지는 대신, 정규화된 식별자 레지스트리 테이블에서 먼저 찾는 방식이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/account-service.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/auth/login/route.ts`
- 왜 이걸 선택했는가:
  - ADR-0016은 guardian signup과 student activation이 섞일 때 `email`과 `loginId` 충돌을 DB 레벨에서 막아야 한다고 정리한다.
  - 이 구조 덕분에 "이메일처럼 보이는 loginId" 같은 애매한 입력도 일관되게 처리할 수 있다.
- 대안과 트레이드오프:
  - 대안: `users.email`과 `users.loginId`를 각각 조회한다.
  - 트레이드오프: 구현은 단순하지만, 충돌과 레이스 조건을 애플리케이션 코드가 더 많이 떠안는다.
- 실무에서 자주 하는 실수:
  - 소문자 정규화를 빼먹어 `Test@`와 `test@`를 다른 계정처럼 다룬다.
  - email/loginId를 별도 unique로만 보고 교차 충돌을 놓친다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/account-service.ts`의 `buildCredentialIdentifierValues`, `resolveUserByIdentifier`를 읽어본다.

### 2.3 JWT + HttpOnly Cookie

- 한 줄 정의: 로그인 성공 시 서버가 서명된 토큰을 만들고, 브라우저 JavaScript가 직접 읽기 어려운 HttpOnly Cookie에 담아 유지한다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/jwt.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/auth-response.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/constants.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/auth/login/route.ts`
- 왜 이걸 선택했는가:
  - ADR-0008은 M1 인증 방식을 커스텀 JWT + HttpOnly Cookie로 고정했다.
  - 현재 프로젝트는 App Router 기반 모놀리식이라, 별도 세션 저장소 없이도 빠르게 인증 흐름을 안정화할 수 있었다.
- 대안과 트레이드오프:
  - 대안: 서버 세션 저장소, Auth.js 같은 인증 프레임워크.
  - 트레이드오프: 기능은 풍부하지만, 지금 프로젝트의 커스텀 student linkage 규칙을 더 깊게 이해해야 한다.
- 실무에서 자주 하는 실수:
  - 토큰을 `localStorage`에 저장한다.
  - `JWT_SECRET` 길이와 만료 설정을 느슨하게 둔다.
  - 토큰은 발급했는데 쿠키 옵션(`HttpOnly`, `SameSite`, `Path`)을 빼먹는다.
- 바로 해볼 체크:
  - 로그인 후 응답 헤더에서 `study_auth_token` 쿠키가 내려오는지 확인한다.
  - `/Users/mark/Documents/project/study-project/apps/web/tests/unit/jwt.test.ts`를 읽어본다.

### 2.4 세션 파싱 + 역할 분기

- 한 줄 정의: API 요청이 들어오면 쿠키에서 토큰을 읽어 `userId`, `role`, `studentId`를 세션 형태로 정리하는 단계다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/session.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/roles.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/workbook-progress/dashboard/route.ts`
- 왜 이걸 선택했는가:
  - route handler가 매번 JWT payload 구조를 직접 해석하면 중복과 실수가 늘어난다.
  - 그래서 "세션 읽기"와 "role home path/role 판별"을 별도 모듈로 분리해 재사용한다.
- 대안과 트레이드오프:
  - 대안: 각 route마다 쿠키를 직접 파싱한다.
  - 트레이드오프: 작은 프로젝트처럼 보여도 인증 예외 케이스가 금방 흩어진다.
- 실무에서 자주 하는 실수:
  - 요청 쿠키 헤더 파싱과 Next `cookies()` 사용을 섞다가 버그를 만든다.
  - `studentId`가 payload에 있다고 해서 ownership 검증을 생략한다.
- 바로 해볼 체크:
  - 학생 토큰과 보호자 토큰에서 `/dashboard` 기본 경로가 어떻게 갈리는지 `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/roles.ts`를 읽어본다.

### 2.5 Ownership Guard

- 한 줄 정의: 로그인 여부를 넘어서, 요청한 학생/자료/오답/문제집이 실제로 내 소유 범위인지 확인하는 권한 가드다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/ownership-guard.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/wrong-notes/[id]/image/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/wrong-notes/[id]/image/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/workbook-progress/route.ts`
- 왜 이걸 선택했는가:
  - ADR-0004는 MVP부터 IDOR를 막기 위해 guardian-student ownership chain 검증을 강제한다고 명시한다.
  - 현재 서비스는 이미지, 오답, 진도처럼 민감한 학생 데이터가 많아서 role 검사만으로는 부족하다.
- 대안과 트레이드오프:
  - 대안: role 기반 미들웨어만 사용한다.
  - 트레이드오프: 구현은 짧아지지만, `studentId`를 바꿔치기하는 요청을 막기 어렵다.
- 실무에서 자주 하는 실수:
  - 인증이 되었으니 권한도 된다고 착각한다.
  - 학생 로그인 계정과 `Student` 프로필 연결 검증을 빼먹는다.
  - 이미지 조회처럼 "읽기 API"는 가볍다고 생각하고 guard를 생략한다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/tests/integration/wrong-notes-routes.test.ts`에서 `403` 경계 케이스를 읽어본다.

## 3. 요청부터 동작까지 흐름 (Level 2)

1. 보호자 가입 또는 학생 활성화:
  - 보호자는 `/signup`, 학생은 `/student/activate`를 사용한다.
  - 가입/활성화 route가 식별자 중복과 비밀번호 정책을 먼저 검증한다.

2. 로그인:
  - `/api/v1/auth/login`이 `resolveUserByIdentifier`로 계정을 찾고 비밀번호를 확인한다.
  - 학생 role이면 `assertStudentLoginOwnership`으로 연결된 학생 프로필까지 확인한다.

3. 토큰 발급:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/jwt.ts`가 JWT를 서명한다.
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/auth-response.ts`가 쿠키로 저장한다.

4. API 요청:
  - 이후 route는 `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/session.ts`로 세션을 읽는다.
  - role이 다르면 바로 `401/403`을 반환한다.

5. 실제 데이터 접근:
  - 보호자 요청은 `assertStudentOwnership`, 학생 요청은 `assertStudentLoginOwnership`으로 학생 범위를 다시 확인한다.
  - 그 다음에야 wrong-note, workbook, image 같은 실제 데이터를 읽거나 수정한다.

심화 포인트(Level 3, 원하면 더 설명 가능):

- JWT payload에 `studentId`를 넣는 이유와 넣어도 guard가 필요한 이유
- guardian/student 계정 생성 시 왜 `credentialIdentifiers`를 같이 생성하는가
- `409 CONFLICT`, `410 EXPIRED`, `403 FORBIDDEN`을 어떻게 나눠 쓰는가

## 4. 학습 확인 질문

1. 이 프로젝트에서 학생 로그인 성공 후에도 `assertStudentLoginOwnership`을 한 번 더 하는 이유는 무엇일까요?
2. `user_credential_identifiers`가 없으면 어떤 종류의 계정 충돌 문제가 생길까요?
3. JWT를 쓴다고 해서 Ownership Guard가 필요 없어지는 것은 왜 아닐까요?

## 5. 메모

- 확실한 사실:
  - 현재 인증은 guardian signup, student activate, JWT cookie, ownership guard가 한 세트로 연결되어 있다.
  - 설명은 `signup`, `student-activate`, `login`, `session`, `ownership-guard`, 관련 integration test를 기준으로 작성했다.
- 추론(검증 필요):
  - 나중에 다중 디바이스 세션 제어, 강제 로그아웃, 비밀번호 재설정이 중요해지면 토큰 회전이나 서버 세션 저장소가 필요할 수 있다.
