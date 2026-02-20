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
  - Type check pass
  - Lint pass
  - Unit/Integration pass
- 릴리즈 기준
  - E2E 핵심 시나리오 pass
  - 치명도 높은 버그 0건

## 6. 오답 기능 검증 포인트

- 이미지 업로드 실패/재시도
- 카테고리 복수 선택 정확성
- 오답 수정/삭제 후 분석 반영 일관성
