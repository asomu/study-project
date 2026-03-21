# Project Status

- Last Updated: 2026-03-21
- Current Phase: M9 Wrong Note-first Service Verified
- Overall Progress: 100%

## 1. Milestone Status

| Milestone | Status | Progress | Owner | Notes |
| --- | --- | --- | --- | --- |
| M0 설계/문서화 | COMPLETED | 100% | Team | 기본 문서/프로세스 세트 구축 완료 |
| M1 기반 구축 | COMPLETED | 100% | Team | 인증, 학생/보호자 라우팅, Prisma/테스트 기반 완료 |
| M2 초기 입력 기능 | COMPLETED | 100% | Team | 문제집/시도/오답 입력 초기 버전 완료 |
| M3 초기 대시보드 | COMPLETED | 100% | Team | overview/weakness/trends 초기 분석 완료 |
| M4 검증/안정화 | COMPLETED | 100% | Team | 회귀 게이트와 운영 체크리스트 고정 완료 |
| M5 리포트/추천 확장 | DEFERRED | 0% | Team | PDF/브리프/추천 고도화는 후속 범위 |
| M6 학생 학습 루프 확장 | COMPLETED | 100% | Team | study 모듈 및 학생 self-service 흐름 완료 |
| M7 학습 콘텐츠 Authoring UI | COMPLETED | 100% | Team | guardian/admin authoring 완료 |
| M8 보호자 통합 Study Dashboard | COMPLETED | 100% | Team | study insight 통합 대시보드 완료 |
| M9 Wrong Note-first Service Rebuild | COMPLETED | 100% | Team | `WrongNote` 모델, 학생/보호자 오답노트 대시보드, 전용 API/테스트/문서 동기화 완료 |

## 2. Current Sprint Focus

- [x] 신규 `WrongNote` 데이터 모델 도입
- [x] Prisma schema + migration + serializer/service/contracts 추가
- [x] 학생 Wrong Note API 구현
  - `POST /api/v1/student/wrong-notes`
  - `GET /api/v1/student/wrong-notes/dashboard`
  - `GET /api/v1/student/wrong-notes`
  - `GET /api/v1/student/wrong-notes/{id}`
  - `PATCH /api/v1/student/wrong-notes/{id}`
  - `POST /api/v1/student/wrong-notes/{id}/image`
  - `DELETE /api/v1/student/wrong-notes/{id}`
- [x] 보호자 Wrong Note API 구현
  - `GET /api/v1/wrong-notes/dashboard`
  - `GET /api/v1/wrong-notes`
  - `GET /api/v1/wrong-notes/{id}`
  - `PUT /api/v1/wrong-notes/{id}/feedback`
- [x] 학생 대시보드 `/student/dashboard`를 오답노트 홈으로 교체
- [x] 보호자 대시보드 `/dashboard`를 오답노트 허브로 교체
- [x] 레거시 진입점 리다이렉트
  - `/student/wrong-answers`
  - `/wrong-answers/manage`
- [x] 레거시 제품 surface 정리
  - guardian/student 상단 네비게이션을 wrong-note 기준으로 단순화
  - `/records/new`, `/study/content`, `/study/reviews`, `/student/study/session`, `/student/progress` 직접 접근 시 wrong-note 홈으로 리다이렉트
  - 수동 QA 체크리스트와 verification gate를 wrong-note 기준으로 갱신
- [x] 업로드 경로 분리
  - `public/uploads/wrong-notes`
- [x] Hybrid TDD 검증
  - unit
  - route-contract/integration
  - real integration
  - mocked e2e
  - real smoke e2e
- [x] 문서 동기화
  - `PRD`
  - `SYSTEM_ARCHITECTURE`
  - `DATA_MODEL`
  - `API_SPEC_V1`
  - `DEVELOPMENT_PLAN`
  - `DECISION_LOG`
  - `PROJECT_STATUS`
  - `HANDOFF`
  - `CONTEXT_INDEX`

## 3. Risks and Blocks

- 기능 구현 블로커 없음
- 검증 블로커 없음
- 현재 제품은 수학 과목 + 수동 분류 + 수동 피드백까지 포함한다.
- OCR, 자동 피드백, 반복 오답 기반 재도전 관리는 아직 없다.
- 레거시 `attempt / wrong-answer / study` 기능은 코드베이스에 남아 있으므로, 다음 정리 단계에서 완전 제거 여부를 판단해야 한다.
- 레거시 API/도메인 코드는 아직 남아 있으나 UI surface와 수동 운영 기준에서는 비활성 처리되었다.

## 4. Next Actions

1. 모바일 실사용 기준으로 wrong-note 업로드와 상세 드로어 UX를 수동 QA한다.
2. 레거시 `wrong-answer`/`study` 화면과 API를 완전 제거할지, 호환용으로 유지할지 결정한다.
3. M5 deferred 범위 중 `보호자 브리프 / PDF 리포트 / 자동 피드백` 우선순위를 다시 정리한다.

## 5. Change Log

- 2026-02-20: 계획 문서 세트 초기 생성
- 2026-02-21: M1 기반 구축 완료
- 2026-02-21: M2 초기 입력/API/오답 이미지 업로드 완료
- 2026-02-21: M3 초기 대시보드 완료
- 2026-02-28: M4 회귀 게이트/운영 체크리스트 고정 완료
- 2026-03-07: 실사용 전환용 보호자 가입 + 학생 활성화 모델 완료
- 2026-03-08: M6 학생 학습 루프 구현 완료
- 2026-03-14: M7 학습 콘텐츠 authoring 완료
- 2026-03-15: M8 보호자 통합 Study Dashboard 완료
- 2026-03-17: HEIC/HEIF wrong-answer 업로드 지원 보강
- 2026-03-21: M9 Wrong Note-first Service Rebuild 완료
  - `WrongNote` 전용 데이터 모델/업로드 경로/API 추가
  - 학생 `/student/dashboard`와 보호자 `/dashboard`를 오답노트 전용 워크스페이스로 교체
  - mocked e2e + real smoke까지 재검증 완료
- 2026-03-21: M9 closeout cleanup 완료
  - 레거시 학습/기록 페이지 직접 접근을 wrong-note 홈으로 리다이렉트
  - 상단 네비게이션에서 legacy study surface 제거
  - 수동 QA 체크리스트와 release gate backup 경로를 wrong-note 기준으로 갱신
