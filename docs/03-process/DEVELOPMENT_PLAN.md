# Development Plan

- Plan Version: v1.1
- Last Updated: 2026-03-21

## 1. Milestones

1. M0: 설계/문서화 완료
2. M1: 기반 구축 완료
3. M2: 초기 입력 기능 완료
4. M3: 초기 대시보드 완료
5. M4: 검증/안정화 완료
6. M5: 리포트/추천 확장 보류
7. M6: 학생 학습 루프 확장 완료
8. M7: 학습 콘텐츠 Authoring UI 완료
9. M8: 보호자 통합 Study Dashboard 완료
10. M9: Wrong Note-first Service Rebuild 완료

## 2. Current Product Direction

- 현재 기본 제품 경험은 학생/보호자 오답노트 대시보드다.
- 신규 기능과 분석은 `WrongNote`를 기준으로 확장한다.
- 레거시 `attempt / wrong-answer / study` 흐름은 코드베이스에 남아 있어도 현재 제품 로드맵의 중심이 아니다.

## 3. M9 Scope Lock (2026-03-21)

포함 범위:

- 신규 1급 엔티티 `WrongNote`
  - `studentId`
  - `curriculumNodeId`
  - `reason`
  - `imagePath`
  - `studentMemo`
  - `guardianFeedback`
  - `guardianFeedbackByUserId`
  - `guardianFeedbackAt`
  - `deletedAt`
- 학생 대시보드 `/student/dashboard`를 오답노트 홈으로 교체
  - 업로드 폼
  - KPI 카드
  - 상위 단원 분포
  - 필터 + 카드 리스트
  - 상세 드로어
  - 수정/삭제/이미지 교체
- 보호자 대시보드 `/dashboard`를 오답노트 허브로 교체
  - 학생 선택
  - KPI 카드
  - 상위 단원 분포
  - 필터 + 카드 리스트
  - 상세 드로어
  - 수동 피드백 저장
- 신규 API
  - `POST /api/v1/student/wrong-notes`
  - `GET /api/v1/student/wrong-notes/dashboard`
  - `GET /api/v1/student/wrong-notes`
  - `GET /api/v1/student/wrong-notes/{id}`
  - `PATCH /api/v1/student/wrong-notes/{id}`
  - `POST /api/v1/student/wrong-notes/{id}/image`
  - `DELETE /api/v1/student/wrong-notes/{id}`
  - `GET /api/v1/wrong-notes/dashboard`
  - `GET /api/v1/wrong-notes`
  - `GET /api/v1/wrong-notes/{id}`
  - `PUT /api/v1/wrong-notes/{id}/feedback`
- 레거시 페이지 정리
  - `/student/wrong-answers` -> `/student/dashboard`
  - `/wrong-answers/manage` -> `/dashboard`
- 문서 동기화
  - `PRD`
  - `SYSTEM_ARCHITECTURE`
  - `DATA_MODEL`
  - `API_SPEC_V1`
  - `DECISION_LOG`
  - `PROJECT_STATUS`
  - `HANDOFF`
  - `CONTEXT_INDEX`

비포함 범위:

- OCR
- 자동 피드백
- PDF/주간 브리프
- 재도전 상태 추적
- 기존 `WrongAnswer` 데이터 이전

## 4. M9 Validation Plan

- Unit
  - reason enum 매핑
  - 대시보드 요약/상위 단원 계산
  - soft delete 제외 규칙
- Route-contract
  - 학생 생성/조회/수정/삭제 권한
  - 보호자 조회/피드백 권한
  - 필수 사진, 잘못된 학기/단원, MIME/용량/시그니처 검증
- Real integration
  - 학생 업로드 -> DB 저장 -> 대시보드 반영
  - 보호자 피드백 -> 학생 재조회 반영
- E2E
  - mocked dashboard regression
  - real smoke

## 5. Deferred Backlog

### M5 Deferred

- 주간 브리프 / PDF 리포트
- 추천 규칙 확장
- 자동 코멘트 생성

### Wrong Note 후속 범위

- OCR 기반 문제 텍스트 보조 입력
- 반복 오답 추적과 재도전 상태
- 피드백 템플릿
- 다과목 확장
