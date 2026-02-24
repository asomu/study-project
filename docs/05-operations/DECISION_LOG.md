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
