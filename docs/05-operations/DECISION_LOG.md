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
