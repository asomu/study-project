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
