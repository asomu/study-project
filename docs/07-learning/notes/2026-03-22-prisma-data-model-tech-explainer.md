# Prisma 데이터 모델 기술 설명

- Date: 2026-03-22
- Source Skill: `study-tech-explainer`
- Related Scope: M1~M10 데이터 모델 기준

## 1. 30초 요약 (Level 1)

- 구현 목표: 학생/보호자 계정, 커리큘럼, 오답노트, 문제집 진도를 서로 어긋나지 않게 하나의 관계형 모델로 묶는다.
- 핵심 기술: Prisma schema, PostgreSQL, migration, seed, `User-Student-CurriculumNode-WrongNote-Workbook` 관계 설계.
- 결과: 화면/API 요구사항이 바뀌어도 "어떤 데이터가 누구 것인지"와 "어떤 단원/문제집에 연결되는지"를 DB 차원에서 안정적으로 표현할 수 있다.

## 2. 기술별 설명

### 2.1 Prisma schema를 제품 계약서처럼 쓰는 방식

- 한 줄 정의: `schema.prisma`를 단순 ORM 설정 파일이 아니라 현재 제품의 데이터 계약서처럼 사용하는 방식이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
  - `/Users/mark/Documents/project/study-project/docs/02-architecture/DATA_MODEL.md`
  - `/Users/mark/Documents/project/study-project/docs/01-product/PRD.md`
- 왜 이걸 선택했는가:
  - 이 프로젝트는 문서 기준 개발을 강조하므로, PRD/아키텍처 문서와 실제 스키마가 크게 어긋나면 바로 운영 혼선이 생긴다.
  - Prisma는 타입과 관계를 코드에서 바로 읽을 수 있어 문서와 대조하기 좋다.
- 대안과 트레이드오프:
  - 대안: SQL migration만 보고 모델을 추적한다.
  - 트레이드오프: DB 관점은 선명하지만, 앱 코드와의 연결을 이해하기가 더 어렵다.
- 실무에서 자주 하는 실수:
  - 스키마를 ORM 구현 세부사항으로만 보고, 제품 규칙은 문서에만 남긴다.
  - 문서는 바뀌었는데 `schema.prisma`가 그대로라서 팀 인식이 갈린다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`와 `/Users/mark/Documents/project/study-project/docs/02-architecture/DATA_MODEL.md`를 나란히 읽어본다.

### 2.2 `User`, `Student`, `UserCredentialIdentifier` 관계

- 한 줄 정의: 로그인 주체(`User`)와 학생 프로필(`Student`)을 분리하고, 식별자 충돌 방지는 별도 테이블로 관리하는 구조다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/auth/account-service.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/auth/student-activate/route.ts`
- 왜 이걸 선택했는가:
  - 보호자와 학생은 둘 다 로그인하지만, 학생은 보호자 소속의 학습 대상이기도 하다.
  - 그래서 "로그인 주체"와 "학습 대상 프로필"을 같은 테이블에 몰아넣기보다 분리하는 편이 권한 경계를 설명하기 쉽다.
- 대안과 트레이드오프:
  - 대안: 학생도 전부 `User` 하나로 보고 profile 컬럼만 추가한다.
  - 트레이드오프: 처음은 단순하지만, guardian-student 연결과 invite 흐름을 설명하기가 더 어려워진다.
- 실무에서 자주 하는 실수:
  - 학생 프로필과 로그인 계정을 1:1로 고정해버려 활성화 전 상태를 표현하지 못한다.
  - 식별자 충돌 규칙을 `users` 한 테이블 unique만으로 끝내려 한다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`의 `User`, `Student`, `UserCredentialIdentifier` 모델을 연달아 읽고 관계를 손으로 그려본다.

### 2.3 `CurriculumNode`는 단원 선택과 버전 선택의 기준점

- 한 줄 정의: 단원, 학년, 학기, 커리큘럼 버전을 한 행에 묶어 현재 적용 단원을 선택할 수 있게 한 모델이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/seed.ts`
  - `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md`
- 왜 이걸 선택했는가:
  - ADR-0005와 ADR-0026은 "같은 중등 수학이라도 학년별 적용 버전이 다를 수 있다"는 현실을 반영한다.
  - wrong-note와 workbook 둘 다 결국 단원 선택이 필요하므로, 공통 기준점이 되는 `CurriculumNode`가 중요하다.
- 대안과 트레이드오프:
  - 대안: 단원명을 문자열로만 저장한다.
  - 트레이드오프: 구현은 빨라지지만, 버전/학년/학기 검증과 정렬이 무너진다.
- 실무에서 자주 하는 실수:
  - 현재 적용 버전과 과거/미래 버전을 한 집합으로 섞어 보여준다.
  - UI 편의 때문에 단원명을 자유 텍스트로 두고, 나중에 통계가 깨진다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/seed.ts`에서 중1/중2/중3의 `activeFrom`과 `curriculumVersion`이 어떻게 다른지 확인한다.

### 2.4 `WrongNote`는 현재 제품의 오답 소스 오브 트루스

- 한 줄 정의: 사진 업로드형 오답 데이터를 기존 `WrongAnswer`와 분리해 직접 저장하는 전용 엔티티다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/wrong-note/service.ts`
  - `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md`
- 왜 이걸 선택했는가:
  - ADR-0022는 학생이 틀린 문제를 바로 올리고, 보호자가 피드백을 남기는 현재 제품 목표에 `WrongNote`가 더 직접적이라고 정리한다.
  - `studentId`, `curriculumNodeId`, `reason`, `imagePath`, `guardianFeedback*`, `deletedAt`이 바로 지금 제품의 핵심 필드다.
- 대안과 트레이드오프:
  - 대안: 기존 `WrongAnswer`를 계속 확장한다.
  - 트레이드오프: 기존 분석 파이프라인 재사용은 쉬울 수 있지만, 현재의 사진 중심 입력 UX와 어긋난다.
- 실무에서 자주 하는 실수:
  - soft delete 필드를 두고도 조회 조건에서 `deletedAt: null`을 빼먹는다.
  - `imagePath`를 공개 URL로 저장해 스토리지 전략 전환을 어렵게 만든다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/wrong-note/service.ts`의 `buildWrongNoteWhere`에서 기본 조회 조건을 읽어본다.

### 2.5 Workbook 계열 모델은 문제집 템플릿과 학생 상태를 분리한다

- 한 줄 정의: 문제집 정의(`WorkbookTemplate`)와 학생에게 배정된 실제 인스턴스(`StudentWorkbook`), 그리고 셀 단위 상태(`StudentWorkbookProgress`)를 나눠 저장하는 구조다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/migrations/20260322010448_workbook_progress/migration.sql`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/workbook/service.ts`
- 왜 이걸 선택했는가:
  - ADR-0027은 기존 `student_unit_progress` 대신 workbook 전용 도메인을 쓰기로 결정했다.
  - 같은 템플릿을 여러 학생에게 배정할 수 있고, 학생별 archived 상태와 셀 단위 진도는 따로 움직여야 하기 때문이다.
- 대안과 트레이드오프:
  - 대안: 템플릿과 학생 진도를 한 테이블에 몰아넣는다.
  - 트레이드오프: 처음은 쉬워 보여도, 재사용/보관/권한 처리가 빠르게 복잡해진다.
- 실무에서 자주 하는 실수:
  - 템플릿 정의와 학생 상태를 같은 행에 넣어 수정 이력이 꼬인다.
  - 복합 unique가 없어 같은 셀 상태가 중복 저장된다.
- 바로 해볼 체크:
  - migration 파일에서 `student_workbook_progress`의 복합 unique 인덱스를 확인한다.

### 2.6 migration + seed는 스키마를 실제로 움직이게 만드는 장치

- 한 줄 정의: schema가 설계도라면, migration은 변경 이력이고 seed는 바로 실행 가능한 샘플 현실이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/migrations/20260322010448_workbook_progress/migration.sql`
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/seed.ts`
  - `/Users/mark/Documents/project/study-project/infra/docker/docker-compose.local.yml`
- 왜 이걸 선택했는가:
  - "스키마는 멋지지만 DB에는 아무것도 없음" 상태를 피하려면 migration과 seed가 꼭 필요하다.
  - 이 프로젝트는 real integration 테스트를 자주 돌리므로, seed가 곧 학습 데이터이자 검증 데이터다.
- 대안과 트레이드오프:
  - 대안: 로컬 DB를 수동 SQL로 맞춘다.
  - 트레이드오프: 한 번은 빨라도, 세션이 바뀔수록 재현성이 급격히 나빠진다.
- 실무에서 자주 하는 실수:
  - migration은 추가했는데 seed가 새 모델을 반영하지 않는다.
  - seed ID가 테스트 helper와 어긋나 real integration이 깨진다.
- 바로 해볼 체크:
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web prisma migrate deploy`
  - `pnpm -C /Users/mark/Documents/project/study-project/apps/web prisma:seed`

## 3. 요청부터 동작까지 흐름 (Level 2)

1. 제품 요구가 생긴다:
  - 예를 들어 "학생 오답에 문제집 단계도 연결하고 싶다"는 요구가 생긴다.

2. schema를 바꾼다:
  - `WrongNote`에 `studentWorkbookId`, `workbookTemplateStageId`를 추가하고, workbook 관련 새 모델을 정의한다.

3. migration을 만든다:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/migrations/20260322010448_workbook_progress/migration.sql`이 실제 테이블, 인덱스, FK를 추가한다.

4. seed를 맞춘다:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/seed.ts`가 현재 커리큘럼 단원과 예시 workbook template를 채운다.

5. route/service가 이 모델을 사용한다:
  - wrong-note route는 `CurriculumNode`와 `WrongNote`를 검증하고,
  - workbook route는 `StudentWorkbookProgress`를 읽어 matrix를 계산한다.

심화 포인트(Level 3, 원하면 더 설명 가능):

- `onDelete: Cascade`, `SetNull`, `Restrict`를 왜 관계마다 다르게 썼는가
- `CurriculumNode`를 string label이 아니라 별도 모델로 둔 이유
- `WrongAnswer`가 남아 있는데도 `WrongNote`를 새로 만든 이유

## 4. 학습 확인 질문

1. 왜 `User`와 `Student`를 분리하는 편이 이 프로젝트에 더 잘 맞을까요?
2. `CurriculumNode`가 없고 단원명을 문자열로만 저장하면 어떤 문제가 생길까요?
3. workbook progress에서 복합 unique 인덱스가 필요한 이유를 설명해볼 수 있나요?

## 5. 메모

- 확실한 사실:
  - 현재 스키마의 핵심 관계는 `User-Student-CurriculumNode-WrongNote-Workbook*` 축으로 정리된다.
  - 설명은 실제 `schema.prisma`, workbook migration, seed 데이터를 기준으로 작성했다.
- 추론(검증 필요):
  - 향후 다과목과 다수 학생 운영이 커지면, curriculum seed 관리와 데이터 이관 전략이 더 중요한 운영 과제가 될 가능성이 높다.
