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
