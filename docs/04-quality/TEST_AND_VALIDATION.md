# Test and Validation Strategy

## 1. 테스트 접근 방식

권장: Hybrid TDD

- 도메인 로직: TDD 우선
- UI 컴포넌트: 상태/상호작용 중심 테스트
- E2E: 핵심 사용자 여정 스모크 + 주요 회귀

## 2. 왜 Hybrid TDD인가

- 전면 TDD는 UI 변경 속도를 저해할 수 있음
- 분석/계산/판정 로직은 TDD가 높은 품질 이점 제공
- 대시보드는 통합/E2E로 신뢰도 확보가 효율적

## 3. 테스트 레벨

1. Unit
- 성취도 계산, 카테고리 집계, 우선순위 로직

2. Integration
- API + DB + 파일 업로드 흐름

3. E2E
- 로그인 -> 입력 -> 오답 업로드 -> 대시보드 반영

## 4. 도구

- Unit/Integration: Vitest, Testing Library, Supertest
- E2E: Playwright
- Mocking: MSW
- Quality: ESLint, Prettier, TypeScript strict mode

## 5. 품질 게이트

- PR 기준
  - `pnpm lint` pass
  - `pnpm typecheck` pass
  - `pnpm test` pass (unit + integration)
  - `bash scripts/check-doc-links.sh` pass
- 릴리즈 기준
  - PR 기준 전체 pass
  - `pnpm test:e2e` pass
  - 치명도 높은 버그 0건

## 6. M4 회귀 게이트 고정 세트 (2026-02-28)

- dashboard 경계/권한 케이스
  - `GET /api/v1/dashboard/overview`: 기본 날짜, 학기 경계, 빈 커리큘럼
  - `GET /api/v1/dashboard/weakness`: `401/403/400` 및 기간별 집계 경계
  - `GET /api/v1/dashboard/trends`: 부분 주간 버킷, `rangeEnd` 단독 입력, 날짜 경계
- 입력 -> 대시보드 반영 흐름
  - `records -> wrong-answers -> dashboard` E2E 데이터 반영 회귀
  - 대시보드 필터 변경 시 API 쿼리 파라미터 반영 회귀
- 오답 카테고리 저장/해제 흐름
  - 카테고리 다중 선택 저장
  - 빈 배열 저장 시 카테고리 맵핑 삭제
  - 저장 결과가 조회/대시보드 분포에 반영되는지 확인

## 7. 오답 기능 검증 포인트

- 이미지 업로드 실패/재시도
- 카테고리 복수 선택 정확성
- 오답 수정/삭제 후 분석 반영 일관성

## 8. 권한/버전 리스크 검증 포인트

- 보호자 A가 보호자 B의 `studentId`로 요청 시 403 반환
- `attemptId/materialId/wrongAnswerId` 경유 요청의 소유권 체인 검증
- `asOfDate` 기준 커리큘럼 버전 선택 정확성
- `curriculumVersion` 명시 시 해당 버전 우선 적용

## 9. FR-테스트 추적 규칙

- FR-001/003/004/005/006은 Unit + Integration으로 기본 검증한다.
- FR-002/007/008/009는 Integration + E2E 스모크를 포함한다.
- PR마다 변경된 FR ID를 PR 설명에 기록하고, 대응 테스트를 연결한다.
