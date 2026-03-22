# Workbook Progress Matrix 기술 설명

- Date: 2026-03-22
- Source Skill: `study-tech-explainer`
- Related Scope: M10 Workbook Progress + Wrong Note Workbook Link

## 1. 30초 요약 (Level 1)

- 구현 목표: 보호자가 만든 문제집 템플릿을 학생에게 배정하고, 학생/보호자가 같은 `단원 x 단계` 진도표를 보게 만든다.
- 핵심 기술: workbook 전용 도메인, stage 정렬/중복 검증, curriculum 기반 matrix 생성, `not_started` 기본값, row upsert, real integration 테스트.
- 결과: 문제집 진도는 단순 체크리스트가 아니라 "정의된 단원 구조 + 단계 구조 + 학생 상태"를 함께 계산하는 데이터 모델로 동작한다.

## 2. 기술별 설명

### 2.1 Workbook 전용 도메인 분리

- 한 줄 정의: 문제집 진도를 기존 학습 진도 모델과 섞지 않고, workbook 전용 모델/서비스/라우트로 따로 분리한 구조다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/workbook/service.ts`
  - `/Users/mark/Documents/project/study-project/docs/05-operations/DECISION_LOG.md`
- 왜 이걸 선택했는가:
  - ADR-0027은 workbook progress를 legacy `student_unit_progress`에 넣지 않고 분리한다고 고정했다.
  - 문제집은 "보호자가 직접 만든 단계 구조"를 가져야 해서 기존 study progress와 성격이 다르다.
- 대안과 트레이드오프:
  - 대안: 기존 `student_unit_progress`를 재사용한다.
  - 트레이드오프: 단원 상태만 저장하는 데는 편하지만, 문제집 단계 구조를 표현하기 어렵다.
- 실무에서 자주 하는 실수:
  - 새 도메인을 만들기 귀찮아서 기존 진도 테이블에 억지로 컬럼을 계속 추가한다.
  - 그러다 결국 "어떤 상태가 어떤 화면을 위한 것인지"가 흐려진다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`에서 `StudentUnitProgress`와 `StudentWorkbookProgress`를 비교해본다.

### 2.2 문제집 템플릿 단계 정렬과 중복 검증

- 한 줄 정의: 사용자가 입력한 단계 목록을 정렬/정규화하고, 같은 이름 단계가 중복되지 않게 막는 로직이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/workbook/service.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/workbook/schemas.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/unit/workbook-service.test.ts`
- 왜 이걸 선택했는가:
  - 보호자 UI는 직접 입력 방식이므로, 입력 순서와 공백, 중복 이름을 서버가 정리해줘야 한다.
  - 그렇지 않으면 matrix 열 순서가 세션마다 달라지고, 같은 단계가 두 번 생긴다.
- 대안과 트레이드오프:
  - 대안: 프론트에서만 순서와 중복을 관리한다.
  - 트레이드오프: UI는 편해 보여도, API가 느슨하면 나중에 다른 입력 경로에서 쉽게 깨진다.
- 실무에서 자주 하는 실수:
  - `"개념원리 이해"`와 `" 개념원리 이해 "`를 다른 단계로 취급한다.
  - sortOrder를 믿기만 하고 재정렬을 안 해 배열 틈이 생긴다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/tests/unit/workbook-service.test.ts`의 첫 두 테스트를 읽어본다.

### 2.3 대시보드용 workbook 선택 로직

- 한 줄 정의: 학생이 가진 workbook 목록 중 무엇을 현재 선택할지 결정하는 로직이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/workbook-progress/dashboard/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/workbook/schemas.ts`
- 왜 이걸 선택했는가:
  - 학생은 여러 workbook을 가질 수 있으므로, `studentWorkbookId`가 있으면 그것을 우선하고, 없으면 grade 기준으로 선택해야 한다.
  - 현재 학년과 다른 선행 workbook도 있을 수 있으므로 "아무거나 첫 번째"보다 더 명확한 기준이 필요했다.
- 대안과 트레이드오프:
  - 대안: 항상 가장 최근 workbook 하나만 보여준다.
  - 트레이드오프: 구현은 쉽지만, 여러 workbook을 동시에 운영할 때 UX가 나빠진다.
- 실무에서 자주 하는 실수:
  - grade 필터와 explicit `studentWorkbookId` 우선순위를 섞어버린다.
  - archived workbook을 대시보드 후보에서 빼먹지 않는다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/workbook-progress/dashboard/route.ts`의 `selectedWorkbook` 결정 부분을 읽어본다.

### 2.4 `not_started` 기본값으로 matrix 채우기

- 한 줄 정의: DB에 저장된 행이 없어도 "아직 시작 안 함"으로 해석해서 전체 행렬을 완성하는 로직이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/workbook/service.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/unit/workbook-service.test.ts`
- 왜 이걸 선택했는가:
  - matrix UI는 모든 단원 x 단계 셀을 보여줘야 하는데, 아직 시작 안 한 셀까지 DB row를 미리 다 만들 필요는 없다.
  - 그래서 sparse 저장 + 계산 시 채우기 방식이 더 단순하고 운영 친화적이다.
- 대안과 트레이드오프:
  - 대안: 배정 시 모든 셀 row를 미리 생성한다.
  - 트레이드오프: 조회는 단순하지만, 데이터 양이 커지고 stage 구조가 바뀔 때 관리가 번거롭다.
- 실무에서 자주 하는 실수:
  - "없는 row"를 빈칸으로 렌더링해서 사용자가 버그로 오해한다.
  - summary/bar 계산에서 없는 셀을 분모에 넣지 않아 완료율이 왜곡된다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/tests/unit/workbook-service.test.ts`의 `fills missing workbook progress cells as not_started` 테스트를 읽어본다.

### 2.5 PUT upsert와 셀 단위 상태 저장

- 한 줄 정의: 특정 workbook, 단원, 단계 셀 하나의 상태를 `upsert`로 저장하거나 갱신하는 방식이다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/workbook-progress/route.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/src/modules/workbook/schemas.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/prisma/schema.prisma`
- 왜 이걸 선택했는가:
  - 사용자는 셀을 클릭할 때마다 즉시 저장되길 기대한다.
  - 이미 있는 셀과 처음 저장하는 셀을 나눠 처리하기보다 `upsert`가 가장 직관적이다.
- 대안과 트레이드오프:
  - 대안: 먼저 조회 후 create/update를 분기한다.
  - 트레이드오프: 구현이 길어지고 동시성 실수 여지가 커진다.
- 실무에서 자주 하는 실수:
  - stage가 해당 workbook 소속인지 검증하지 않는다.
  - curriculum node가 해당 학년/학기 workbook 범위인지 확인하지 않는다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/src/app/api/v1/student/workbook-progress/route.ts`에서 stage 검증과 curriculum 검증 순서를 읽어본다.

### 2.6 real integration으로 학생/보호자 동기화 검증

- 한 줄 정의: 보호자 템플릿 생성부터 학생 상태 변경, 보호자 대시보드 반영, wrong-note 연결까지 실DB 기준으로 끝까지 검증하는 테스트다.
- 이번 프로젝트 적용 지점:
  - `/Users/mark/Documents/project/study-project/apps/web/tests/real-integration/workbook-progress-real.test.ts`
  - `/Users/mark/Documents/project/study-project/apps/web/tests/integration/workbook-routes.test.ts`
- 왜 이걸 선택했는가:
  - workbook 기능은 단순 계산만이 아니라 guardian/student 양쪽 화면과 wrong-note 연결까지 함께 맞아야 한다.
  - 따라서 unit만으로는 충분하지 않고, 실제 seed DB 흐름을 확인해야 한다.
- 대안과 트레이드오프:
  - 대안: mocked route 테스트만 유지한다.
  - 트레이드오프: 빠르지만 실제 FK/seed/업로드 연결이 깨져도 뒤늦게 발견될 수 있다.
- 실무에서 자주 하는 실수:
  - 학생 화면만 보고 보호자 반영까지는 확인하지 않는다.
  - wrong-note linkage를 workbook 검증에서 따로 본다.
- 바로 해볼 체크:
  - `/Users/mark/Documents/project/study-project/apps/web/tests/real-integration/workbook-progress-real.test.ts`를 처음부터 끝까지 따라 읽어본다.

## 3. 요청부터 동작까지 흐름 (Level 2)

1. 보호자가 템플릿을 만든다:
  - 제목, 출판사, 학년, 학기, 단계 목록을 보낸다.
  - 서버는 단계 순서를 정리하고 중복 이름을 막는다.

2. 보호자가 학생에게 배정한다:
  - `StudentWorkbook`가 생성되어 "학생이 실제로 쓰는 workbook 인스턴스"가 된다.

3. 학생 대시보드가 열린다:
  - 서버는 선택된 workbook의 학년/학기에 맞는 `CurriculumNode` 목록을 읽는다.
  - 저장된 `StudentWorkbookProgress` row를 읽어 matrix를 계산한다.

4. 셀을 클릭해 상태를 바꾼다:
  - `PUT /api/v1/student/workbook-progress`가 stage 소속과 curriculum 범위를 검증한다.
  - 이후 `upsert`로 셀 상태를 저장하고, 해당 row를 다시 계산해 응답한다.

5. 보호자도 같은 데이터를 본다:
  - guardian dashboard는 같은 workbook progress 데이터를 읽으므로 학생과 같은 summary/bar/matrix를 본다.
  - 필요하면 wrong-note도 특정 workbook/stage에 연결된다.

심화 포인트(Level 3, 원하면 더 설명 가능):

- 왜 matrix 전체 row를 미리 만들지 않고 계산 시 채우는가
- 왜 workbook template 수정은 배정 후 제한하는가
- 왜 `completedPct`를 저장하지 않고 계산값으로 두는가

## 4. 학습 확인 질문

1. workbook progress에서 "없는 row"를 왜 `not_started`로 해석하는 편이 유리할까요?
2. `StudentWorkbook`와 `WorkbookTemplate`를 분리하는 이유를 설명해볼 수 있나요?
3. 셀 상태 저장에 `upsert`가 잘 맞는 이유는 무엇일까요?

## 5. 메모

- 확실한 사실:
  - 현재 workbook progress는 템플릿 정의, 학생 배정, 셀 상태 저장, matrix 계산으로 나뉘어 있다.
  - 설명은 service, student dashboard route, update route, unit/integration/real integration 테스트를 기준으로 작성했다.
- 추론(검증 필요):
  - 나중에 진도 히스토리나 활동 로그가 중요해지면, 현재의 "최신 상태 row만 저장" 구조 위에 별도 이벤트 로그 테이블이 추가될 가능성이 있다.
