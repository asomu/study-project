# Decision Log (ADR-lite)

## ADR-0001: 아키텍처 시작점

- Date: 2026-02-20
- Decision: 모듈형 모놀리식으로 시작
- Rationale: MVP 속도와 복잡도 균형
- Consequence: 경계가 흐려지지 않도록 모듈 규칙 필요

## ADR-0002: 배포 전략

- Date: 2026-02-20
- Decision: Mac mini 로컬 호스팅 우선
- Rationale: 초기 운영 비용 절감과 빠른 반복
- Consequence: 외부 전환 대비 컨테이너 표준 유지 필요

## ADR-0003: 테스트 전략

- Date: 2026-02-20
- Decision: Hybrid TDD
- Rationale: 도메인 로직 품질 확보 + UI 개발 속도 균형
- Consequence: 테스트 가이드와 책임 분리가 중요

## ADR-0004: MVP 계정/권한 모델

- Date: 2026-02-20
- Decision: MVP는 보호자 로그인 + 학생 프로필 모델로 고정하고 API에서 소유권 체인 검증을 강제
- Rationale: 권한 경계를 단순화하고 IDOR 위험을 선제적으로 차단
- Consequence: 학생 독립 로그인은 후속 단계에서 별도 설계 필요

## ADR-0005: 커리큘럼 버전 선택 규칙

- Date: 2026-02-20
- Decision: 커리큘럼 조회는 `asOfDate` 필수, `curriculumVersion` 선택 파라미터로 운영
- Rationale: 2022.12/2026.01 등 다중 버전 공존 상황에서 일관된 조회 보장
- Consequence: API/테스트에서 버전 메타 검증 시나리오를 유지해야 함

## ADR-0006: 공식 데이터 수집 경로

- Date: 2026-02-20
- Decision: NCIC 수집은 `inventoryNodeList`, `invFileList`, `inv/org/download` 경로를 표준으로 고정
- Rationale: `bbs/standard/view/*` 404 리스크로 상세 페이지 수집 신뢰성이 낮음
- Consequence: 성취수준 상세 데이터는 별도 안정 경로 확인 전 자동수집 대상에서 제외

## ADR-0007: 외부 접근 운영 정책

- Date: 2026-02-20
- Decision: 초기 운영은 로컬 네트워크 우선, 외부 공개는 TLS/접근제어 검증 후 단계적으로 허용
- Rationale: 개인정보 노출 리스크를 낮추고 운영 복잡도를 통제
- Consequence: 외부 공개 전 보안 점검 체크리스트가 필수

## ADR-0008: M1 기반 구축 범위/인증 방식 고정

- Date: 2026-02-20
- Decision: M1은 코어 기반(Next.js + Prisma + JWT + 기본 UI + 테스트 게이트)까지만 포함하고, 인증은 커스텀 JWT + HttpOnly 쿠키로 고정
- Rationale: MVP 초기에는 필수 경로를 빠르게 안정화하고, 인프라 확장(Redis/MinIO/Caddy)은 M2 이후로 분리해 리스크를 줄임
- Consequence: M1 완료 판정 시 DB 런타임 검증과 권한 테스트를 우선 확인하고, 나머지 인프라 요소는 후속 마일스톤에서 별도 추적해야 함

## ADR-0009: 기술 설명 학습 노트 보관 정책

- Date: 2026-02-21
- Decision: `study-tech-explainer`로 생성된 설명은 `docs/07-learning` 영역에 문서화하고 인덱스로 관리한다.
- Rationale: 구현 설명을 세션성 대화로 소실하지 않고 학습 자산으로 재사용하기 위함.
- Consequence: explainer 사용 시 노트 저장/인덱스 갱신 작업이 추가되며, 운영 문서와 링크 무결성 검증이 필요하다.

## ADR-0010: M2 오답 이미지 로컬 저장 정책

- Date: 2026-02-21
- Decision: M2 이미지 업로드는 로컬 파일시스템(`public/uploads/wrong-answers`)에 저장하고 DB에는 공개 상대 경로만 기록한다.
- Rationale: MinIO 도입 전 단계에서 구현 복잡도를 낮추면서도 실제 업로드/조회 플로우를 빠르게 검증하기 위함.
- Consequence: 스토리지 사용량/백업 점검이 운영 체크리스트에 추가되며, 외부 스토리지 전환 시 경로 마이그레이션 전략이 필요하다.

## ADR-0011: M3 대시보드 계산/시각화 규칙 고정

- Date: 2026-02-21
- Decision: M3 대시보드 MVP는 `attempt_items` 직접 집계를 기준으로 `overview/weakness/trends`를 계산하며, 차트는 외부 라이브러리 없이 SVG/CSS로 구현한다.
- Rationale: MVP 단계에서 데이터 흐름 추적 가능성과 계산 재현성을 우선 확보하고, 의존성 증가 없이 빠르게 검증 가능한 대시보드를 제공하기 위함.
- Consequence: 집계 쿼리/계산 로직 회귀 테스트가 필수이며, 고급 시각화/추천 로직은 M4 이후 별도 단계에서 확장해야 한다.

## ADR-0012: M4 운영 체크리스트/회귀 게이트 고정

- Date: 2026-02-28
- Decision: M4 마무리 기준으로 운영 체크리스트(백업/보관/정리/알림/TLS 사전점검)와 PR/릴리즈 회귀 게이트를 문서 기준으로 고정한다.
- Rationale: M4가 완료되어도 운영/검증 규칙이 문서로 고정되지 않으면 세션마다 품질 기준이 흔들리고 회귀 재발 위험이 커지기 때문이다.
- Consequence: 세션 종료 시 `PROJECT_STATUS`와 `HANDOFF`는 고정된 게이트 기준으로만 완료 판정하며, 운영 점검은 체크리스트 주기에 따라 반복 실행해야 한다.

## ADR-0013: 2단계 검증 실행 정책 표준화

- Date: 2026-03-01
- Decision: 검증 실행은 `PR 스모크`와 `릴리즈 풀회귀` 2단계로 분리하고, 표준 스크립트(`pnpm verify:pr`, `pnpm verify:release`)로 운영한다.
- Rationale: 수동으로 게이트를 조합하면 누락/편차가 발생하므로 실행 경로를 스크립트로 고정해 일관성과 재현성을 확보하기 위함이다.
- Consequence: PR 단계에서는 빠른 실패 감지와 경로 기반 추가 E2E를 적용하고, 릴리즈 단계에서는 운영 체크(업로드/백업 경로, 용량 임계치)까지 포함한 `Go/No-Go` 판정을 강제해야 한다.

## ADR-0014: 릴리즈 하드닝은 truthful lean stack 기준으로 진행

- Date: 2026-03-07
- Decision: 릴리즈 하드닝 단계에서는 현재 구현된 lean stack(Next.js + Prisma + PostgreSQL + 로컬 업로드 + GitHub Actions + 수동 배포)을 기준으로 문서와 검증 체계를 고정하고, Redis/MinIO/Caddy/관측성 스택은 deferred candidate로 유지한다.
- Rationale: 문서가 실제 구현보다 앞서 있으면 진행률과 릴리즈 준비도 판단이 왜곡되므로, 먼저 현재 구조를 진실하게 고정하고 테스트/CI/운영 절차를 강화하는 것이 MVP 릴리즈에 더 유리하다.
- Consequence: `TECH_STACK`, `SYSTEM_ARCHITECTURE`, `PROJECT_STRUCTURE`, `PRD`, `PROJECT_STATUS`는 실제 구현 기준으로 유지해야 하며, 리포트 산출물/추천 메시지와 planned infra catch-up은 M5 이후로 분리 추적한다.

## ADR-0015: 실사용 전환은 보호자 가입 + 학생 초대코드 활성화 모델로 확장

- Date: 2026-03-07
- Decision: guardian-only MVP 계정 모델을 `보호자 직접 가입 -> 학생 프로필 생성 -> 초대코드 발급 -> 학생 첫 활성화` 흐름으로 확장하고, 역할별 대시보드를 분리한다.
- Rationale: 실제 사용 단계에서는 보호자와 학생이 서로 다른 진입점과 권한 경계를 가져야 하며, 학생 계정을 이메일 수집 없이도 안전하게 연결할 수 있어야 한다.
- Consequence: `User.loginId`, `Student.loginUserId`, `StudentInvite`가 핵심 연결점이 되며, 보호자 전용 API/page guard와 학생 전용 dashboard API를 분리 유지해야 한다.

## ADR-0016: 로그인 식별자는 별도 레지스트리로 전역 유니크 보장

- Date: 2026-03-07
- Decision: `email`과 `loginId` 충돌 방지는 애플리케이션 사전 조회만으로 두지 않고, `user_credential_identifiers` 테이블로 정규화해 DB 레벨에서 전역 유니크를 보장한다.
- Rationale: guardian signup과 student activation이 동시 실행될 때 교차 필드(`email` vs `loginId`) 레이스가 발생하면 식별자가 모호한 계정 상태가 생길 수 있기 때문이다.
- Consequence: 로그인 조회는 `user_credential_identifiers`를 기준으로 수행해야 하고, 학생 계정 재설정 시 기존 식별자 매핑을 제거해 동일 `loginId`를 다시 사용할 수 있게 해야 한다.

## ADR-0017: M6 학생 학습 세션은 Study 모듈이 orchestration하고 Attempt/WrongAnswer를 재사용

- Date: 2026-03-08
- Decision: 학생 학습 루프는 신규 `Study` 모듈(`PracticeSet`, `ConceptLesson`, `StudyReview`, `StudentUnitProgress`)로 확장하되, 실제 풀이 결과 저장은 기존 `Attempt`, `AttemptItem`, `WrongAnswer`를 재사용하고 `Attempt.materialId`는 nullable로 바꾸지 않는다.
- Rationale: M2/M3에서 이미 검증된 입력/오답/분석 파이프라인을 그대로 유지하면 회귀 리스크를 줄이면서 자동채점, 보호자 피드백, 학생 오답 self-service를 빠르게 붙일 수 있다.
- Consequence: practice session 시작 시 `practice:{studentId}:{practiceSetId}` 키 기반 숨김 system `Material`을 지연 생성해야 하며, 모든 study route는 `sourceType=practice`와 현재 학기 범위를 일관되게 강제해야 한다.

## ADR-0018: 웹 필기 캔버스 v1은 PNG snapshot 저장 + localStorage 복구만 지원

- Date: 2026-03-08
- Decision: 학생 필기 입력은 세션당 PNG snapshot 1장만 서버에 저장하고, stroke replay/공동 편집/서버 autosave는 제외하며 브라우저 `localStorage` 복구만 제공한다.
- Rationale: iPad 필기 기록은 MVP 경험에 중요하지만 stroke 단위 동기화까지 포함하면 데이터 모델과 네트워크 복잡도가 크게 증가하므로, 우선 제출 증빙/보호자 리뷰에 필요한 최소 산출물을 고정하는 편이 현실적이다.
- Consequence: 서버는 `data:image/png;base64,...`만 허용하고 이미지 시그니처 검증을 수행해야 하며, 수동 iPad/Pencil QA와 파일 크기/로딩 시간 측정이 운영 체크리스트에 남는다.

## ADR-0019: M7 학습 콘텐츠 authoring은 Study 모듈 내부 write surface로 유지

- Date: 2026-03-14
- Decision: guardian/admin용 학습 콘텐츠 운영은 `/study/content` 단일 화면과 `Study` 모듈 내부 write API(`PracticeSet`, `ConceptLesson`)로 구현하고, 학생 조회 API를 그대로 재사용 가능한 데이터 형태로 유지한다.
- Rationale: practice set / concept lesson authoring은 운영 공백을 메우는 것이 목적이므로, 별도 authoring 서비스나 draft 시스템까지 확장하기보다 현재 `Study` 도메인 안에서 검증 규칙과 즉시 반영 경로를 고정하는 편이 구현 복잡도와 회귀 리스크를 가장 낮춘다.
- Consequence: used `PracticeSet`은 attempt 발생 이후 구조적으로 immutable 취급하며 메타데이터와 `isActive`만 수정할 수 있고, authoring 조회는 학생 화면과 달리 현재 날짜 제약 없이 선택 학기의 최신 `curriculumVersion`을 기준으로 동작해야 한다. draft/versioning/publish workflow와 bulk import/export는 후속 범위로 남는다.

## ADR-0020: M8 보호자 대시보드 통합은 additive endpoint + 규칙 기반 action priority로 고정

- Date: 2026-03-15
- Decision: M8은 기존 `/dashboard`를 유지한 채 `GET /api/v1/dashboard/study-overview`를 추가하는 방식으로 학습 루프 데이터를 통합하고, 추천은 `미리뷰 제출 세션 -> review_needed 단원 -> stalled in_progress -> planned` 고정 규칙으로만 제공한다.
- Rationale: 기존 `overview/weakness/trends` response shape를 깨지 않으면서 보호자가 바로 개입할 actionable surface를 빠르게 넣는 것이 우선이고, 주간 리포트/LLM 코멘트까지 동시에 도입하면 정책 복잡도와 회귀 리스크가 커진다.
- Consequence: guardian dashboard는 분석 카드와 study insight를 병행 유지하며, deep-link는 `/study/reviews?studentId=`로 단순화한다. 추천은 rule-based이므로 explainable하지만, 주간 브리프/PDF/email digest와 richer recommendation은 M5 deferred 범위로 남는다.

## ADR-0021: wrong-answer 이미지 업로드는 iPad 기본 포맷(HEIC/HEIF)까지 허용

- Date: 2026-03-17
- Decision: guardian/student wrong-answer 이미지 업로드는 기존 `jpeg/png/webp`에 더해 `heic/heif` MIME과 시그니처를 허용한다.
- Rationale: 실제 학생 사용 환경이 iPad 중심이므로, 기본 사진 포맷을 지원하지 않으면 학생 오답노트 업로드가 현장 사용성에서 막힌다.
- Consequence: 업로드 입력 `accept`와 API spec을 같이 갱신해야 하며, 업로드 제한은 기존처럼 `UPLOAD_MAX_BYTES` 기본 5MB를 유지한다.

## ADR-0022: 현재 제품의 오답 소스 오브 트루스는 WrongNote 전용 모델로 분리

- Date: 2026-03-21
- Decision: 학생 사진 업로드형 오답노트는 기존 `WrongAnswer` 파이프라인을 확장하지 않고, 별도 1급 엔티티 `WrongNote`와 전용 학생/보호자 대시보드로 재구성한다.
- Rationale: 제품의 핵심 목표가 "학생이 틀린 문제를 바로 올리고, 단원/오류유형별로 누적 통계와 피드백을 본다"로 재정의되면서, `Attempt/Study` 중심 모델에 종속된 기존 구조보다 직접 업로드/직접 피드백에 최적화된 단순 모델이 더 명확하고 회귀 리스크가 낮다.
- Consequence:
  - 신규 대시보드 통계와 카드 탐색은 `WrongNote`만 기준으로 계산한다.
  - `WrongNote`는 `studentId`, `curriculumNodeId`, `reason`, `imagePath`, `studentMemo`, `guardianFeedback*`, `deletedAt`을 가진다.
  - 학생 홈 `/student/dashboard`와 보호자 홈 `/dashboard`는 오답노트 전용 워크스페이스로 교체한다.
  - 기존 `wrong-answers/manage`, `student/wrong-answers`는 신규 대시보드로 연결한다.
  - 레거시 `WrongAnswer` 데이터는 마이그레이션하지 않고 코드베이스 내 레거시 경로로만 남긴다.

## ADR-0023: WrongNote는 학생 현재 학년이 아니라 선택한 대상 학년으로 분류할 수 있다

- Date: 2026-03-21
- Decision: WrongNote 업로드/수정/필터는 학생 프로필의 현재 학년에 고정하지 않고, 같은 학교급 안의 다른 학년을 대상 학년으로 선택할 수 있게 한다.
- Rationale: 실제 학생은 선행 학습으로 상위 학년 단원을 풀 수 있으므로, 현재 학년만 허용하면 오답 데이터가 왜곡되고 실사용 입력이 막힌다.
- Consequence:
  - 학생/보호자 UI는 `대상 학년 -> 학기 -> 단원` 순서로 선택한다.
  - `POST/PATCH /student/wrong-notes`와 list filter는 `grade`를 함께 다룬다.
  - 서버 검증은 `student.schoolLevel` 안의 허용 학년인지 확인하고, `curriculum_nodes.grade/semester`로 최종 검증한다.
  - `WrongNote` 테이블 스키마는 유지하고, 대상 학년은 연결된 `curriculum_node`에서 파생한다.

## ADR-0024: WrongNote 분포 시각화는 전용 chart endpoint + 가로 bar 차트로 고정

- Date: 2026-03-21
- Decision: 학생/보호자 wrong-note 대시보드의 분포 시각화는 dashboard summary와 분리된 전용 `GET */wrong-notes/chart` endpoint로 제공하고, UI는 `그래프 기준 / 대상 학년 / 학기` 콤보박스로 바뀌는 가로 bar 차트로 고정한다.
- Rationale: 기존 정적 `topUnits` 카드만으로는 학생/보호자가 선행 학년과 학기 조건을 바꿔가며 분포를 탐색하기 어렵고, 목록 필터와 별개 상태의 빠른 시각화 surface가 필요했다.
- Consequence:
  - `dimension=unit|reason`, `grade`, `semester`를 받는 학생/보호자 chart endpoint를 유지한다.
  - `dimension=unit`은 선택 학년/학기의 전체 단원을 0건까지 포함한다.
  - `dimension=reason`은 3개 오류유형 고정 순서를 유지한다.
  - 기존 dashboard response의 `topUnits`는 호환용 additive field로만 남고, 기본 UI는 chart endpoint를 사용한다.

## ADR-0025: WrongNote 이미지는 repo 밖 앱 데이터 루트에 저장하고 guarded image API로만 노출

- Date: 2026-03-22
- Decision: Mac mini 단일 호스트 운영에서는 wrong-note 이미지를 git repo 내부 `public/uploads/wrong-notes`에 두지 않고, `~/Library/Application Support/study-project/wrong-notes`에 저장하며 브라우저 노출은 학생/보호자 ownership 검증을 거친 image API로만 수행한다.
- Rationale: 코드/배포 산출물과 사용자 업로드 데이터를 같은 디렉터리에 두면 정리 작업, 테스트 cleanup, 브랜치 이동 시 실제 학생 이미지가 유실되기 쉽고, 정적 공개 경로는 권한 제어도 약하다. 로컬 디스크만 사용하는 조건에서도 "repo 밖 앱 데이터 루트 + DB storage key + guarded stream" 구조가 가장 운영 친화적이다.
- Consequence:
  - `wrong_notes.image_path`는 공개 URL이 아니라 storage key를 저장한다.
  - API 응답 `imagePath`는 `/api/v1/student/wrong-notes/{id}/image` 또는 `/api/v1/wrong-notes/{id}/image?studentId=...` URL이다.
  - 테스트는 `apps/web/.tmp/test-data/wrong-notes`를 사용해 운영 저장소와 완전히 분리한다.
  - legacy `/uploads/wrong-notes/...` 값은 read-only 호환만 유지한다.
  - 파일 누락/고아 파일은 audit script로 점검하고, 앱 데이터 루트 전체는 backup script로 보존한다.

## ADR-0026: 중등 수학 단원 시드는 현재 적용 학년별 버전으로 유지한다

- Date: 2026-03-22
- Decision: wrong-note 단원 선택용 `curriculum_nodes`는 2026-03-22 기준 현재 적용 버전을 학년별로 나눠 유지한다. 중1/중2는 `2022.12`, 중3은 `2015.09`를 active catalog로 사용한다.
- Rationale: 2022 개정 교육과정은 중학교 전 학년에 동시에 적용되지 않고 2025-03-01(중1), 2026-03-01(중2), 2027-03-01(중3) 순으로 시행된다. 모든 학년을 단일 `2026.01` 또는 레거시 샘플로 두면 현재 학년별 콤보박스 단원 선택이 실제 운영 커리큘럼과 어긋난다.
- Consequence:
  - `/api/v1/curriculum`의 `asOfDate` 조회는 현재 날짜 기준으로 학년별 상이한 버전을 반환할 수 있다.
  - wrong-note 업로드/상세/필터/차트의 단원 콤보박스는 2026-03-22 현재 수업 기준에 맞는 단원 집합을 사용한다.
  - 단원 granularity는 성취기준 코드가 아니라 학생 입력 UX에 맞는 대표 단원명으로 정규화한다.
  - 중3의 2022 개정 전환이 시작되는 2027년에는 seed와 authoring version selection 규칙을 다시 점검해야 한다.

## ADR-0027: 문제집 진도는 Workbook 전용 도메인으로 분리하고 오답노트에는 optional linkage만 둔다

- Date: 2026-03-22
- Decision: 문제집 진도 관리 기능은 legacy `student_unit_progress`를 재사용하지 않고 `WorkbookTemplate`, `WorkbookTemplateStage`, `StudentWorkbook`, `StudentWorkbookProgress` 전용 도메인으로 구현하며, `WrongNote`에는 `studentWorkbookId`, `workbookTemplateStageId` optional linkage만 추가한다.
- Rationale: 현재 제품의 핵심 흐름은 "보호자가 직접 문제집 구조를 입력하고, 학생이 그 문제집의 단원별 단계 상태를 관리한다"는 workbook-specific UX다. 기존 학습 진도 모델은 study session 흐름과 결합되어 있어 문제집 단계 구조와 학생/보호자 공통 matrix UX를 자연스럽게 표현하기 어렵다. 전용 Workbook 도메인으로 분리하면 권한, API shape, summary/bar/matrix 계산 규칙을 명확하게 고정할 수 있다.
- Consequence:
  - 보호자 UI에서 문제집 템플릿을 직접 등록하고 학생에게 배정한다.
  - 진도 상태는 `not_started | in_progress | completed` 3단계만 사용한다.
  - matrix는 전체 row를 미리 생성하지 않고, 없는 조합을 `not_started`로 해석한다.
  - 학생과 보호자는 둘 다 workbook progress 상태를 수정할 수 있다.
  - wrong-note workbook linkage는 optional이며, workbook을 선택한 경우 stage 선택은 required다.
  - 템플릿이 배정된 뒤에는 단계 구조 편집을 막고 제목/출판사/활성 상태만 수정한다.

## ADR-0028: WrongNote 워크스페이스의 핵심 UX는 요약 우선 + 모드 분리 + 선택 입력 접기 + inline 편집으로 고정

- Date: 2026-03-22
- Decision: 학생/보호자 공통 `WrongNoteWorkspace`는 핵심 KPI를 상단에 먼저 노출하고, 학생 빠른 업로드는 필수 입력과 선택 입력을 분리하며, 보호자 화면은 `학생 보기`와 `문제집 관리` 모드로 나눈다. 보호자 문제집 템플릿 수정은 `prompt`가 아니라 inline 편집으로 수행하고, workbook progress matrix는 모바일에서 카드 기반 대안 UI를 함께 제공한다. 오답 상세는 keyboard 접근 가능한 side sheet dialog로 제공한다.
- Rationale: 현재 제품의 핵심 과제는 "한 화면에서 현재 상태를 이해하고 바로 행동한다"는 점이다. 학생에게는 빠른 첫 저장이, 보호자에게는 끊김 없는 템플릿 관리와 피드백 흐름이 중요하다. 모든 입력을 기본 화면에 펼치거나 브라우저 `prompt`에 의존하면 중학생/보호자 모두 판단 비용이 커지고, 보호자 화면에 관리 기능과 학생 상태를 한 스크롤에 몰아두면 정보 밀도가 높아진다. 상세 드로어가 dialog semantics 없이 동작하면 접근성과 수정 피드백도 약해진다.
- Consequence:
  - 학생 업로드 폼은 `사진 / 대상 학년 / 학기 / 단원 / 오류유형`을 기본 입력으로 두고, `문제집 연결 / 단계 / 학생 메모`는 선택 입력 영역으로 접는다.
  - 보호자 workspace는 `학생 보기`와 `문제집 관리` 토글을 두고, 학생 상태 확인과 템플릿/배정 관리를 분리한다.
  - 보호자 workbook template 제목/출판사 수정은 현재 값을 유지한 inline editor에서 저장/취소한다.
  - 핵심 KPI는 workbook/chart/filter보다 먼저 배치한다.
  - workbook progress matrix는 desktop/tablet table을 유지하되, 모바일에서는 단원 카드 + 단계 상태 리스트로 대체 표현한다.
  - 상세 드로어는 `role="dialog"`/`aria-modal`과 keyboard close/focus loop를 갖춘 side sheet로 유지한다.
  - mocked e2e는 선택 입력 토글, 보호자 모드 전환, inline 템플릿 수정, dialog 기반 상세 상호작용을 회귀 범위로 포함한다.

## ADR-0029: 초등 수학 단원 시드도 현재 적용 버전 기준으로 추가한다

- Date: 2026-03-22
- Decision: wrong-note 단원 선택용 `curriculum_nodes`에 초등 수학을 추가하고, 2026-03-22 기준 초1~초6 전체를 `2022.12` active catalog로 유지한다.
- Rationale: 2022 개정 교육과정은 초등학교에도 순차 적용되며, 2026-03-01부터 5~6학년까지 전면 적용된다. 따라서 2026-03-22 운영 기준에서 초등 수학 단원이 비어 있으면 elementary 학생의 업로드/필터/문제집 연동 콤보박스가 실제 교과 흐름을 반영하지 못한다.
- Consequence:
  - `/api/v1/curriculum`은 `schoolLevel=elementary` 조회에도 현재 active `2022.12` 단원 집합을 반환한다.
  - 초등 단원명은 공식 성취기준의 학년군 구조를 바탕으로, 앱 UX를 위해 `학년 / 학기 / 대표 단원명`으로 정규화한다.
  - 초등 1~2, 3~4, 5~6의 적용 시점은 각각 `2024-03-01`, `2025-03-01`, `2026-03-01`로 유지한다.
  - 향후 publisher-specific authoring이나 교과서 단원 단위 세분화가 필요해지면, 현재 대표 단원 라벨을 더 세밀한 catalog로 재점검해야 한다.
