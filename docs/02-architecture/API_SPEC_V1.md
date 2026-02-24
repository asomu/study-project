# API Spec v1 (Draft)

- Version: v1.2-draft
- Date: 2026-02-21
- Base path: `/api/v1`

## 1. Auth

### POST /auth/login

- request: { email, password }
- response: { accessToken, user }

### POST /auth/logout

- response: 204

## 2. Student

### GET /students

- 보호자 계정의 학생 목록 조회

### POST /students

- request: { name, schoolLevel, grade }
- response: student

## 2.1 Authorization Guard (MVP 공통 규칙)

- 서버는 JWT 기반 사용자 기준으로 허용된 `studentId` 목록을 계산한다.
- 요청 본문/쿼리의 `studentId`가 허용 목록 밖이면 `403 FORBIDDEN`을 반환한다.
- `attemptId`, `materialId`, `wrongAnswerId` 경유 요청도 소유권 체인을 검증한다.
- 클라이언트 입력값만으로 학생 소유권을 신뢰하지 않는다.

## 3. Curriculum

### GET /curriculum

query:
- schoolLevel
- subject (default math)
- grade
- semester
- asOfDate (required, YYYY-MM-DD)
- curriculumVersion (optional; ex: 2022.12, 2026.01)

response:
- 단원 트리 배열
- 적용 버전 메타 정보 { curriculumVersion, effectiveFrom, effectiveTo }

validation:
- `asOfDate` 누락/형식 오류 시 `400 VALIDATION_ERROR`
- `curriculumVersion` 명시 시 해당 버전을 우선 조회
- 명시 버전이 없으면 `asOfDate` 기준 활성 버전 중 최신 버전 선택
- 조회 결과가 없으면 `404 NOT_FOUND`

## 4. Materials and Attempts

### POST /materials

- request: { studentId, title, publisher, subject, grade, semester }
- authorization: studentId must belong to authenticated guardian
- validation: M2는 `subject=math`만 허용
- response: 201 material

### POST /attempts

- request: { studentId, materialId, attemptDate, notes }
- authorization: studentId/materialId ownership chain must be valid
- validation: `materialId`와 `studentId` 체인이 일치해야 함
- response: 201 attempt

### POST /attempts/{attemptId}/items

- request: { items: [{ curriculumNodeId, problemNo, isCorrect, difficulty }] }
- authorization: attemptId ownership must be valid
- validation:
  - payload 내부 `problemNo` 중복 금지
  - 기존 attempt 문항과 `problemNo` 충돌 금지
  - `difficulty`는 1..5
  - `curriculumNodeId` 유효성 검증
- response: 201 { attemptId, items }

## 5. Wrong Answers

### POST /wrong-answers

- request: { attemptItemId, memo }
- response: wrongAnswer
- authorization: attemptItemId ownership must be valid
- validation: `isCorrect=false` 문항에서만 생성/업데이트 가능

### POST /wrong-answers/{id}/image

- multipart form-data
- field: file
- response: { imagePath }
- authorization: wrongAnswer ownership must be valid
- storage:
  - 저장 위치: `public/uploads/wrong-answers`
  - 허용 MIME: `image/jpeg`, `image/png`, `image/webp`
  - 업로드 제한: `UPLOAD_MAX_BYTES` (기본 5MB)

### PUT /wrong-answers/{id}/categories

- request: { categoryKeys: ["calculation_mistake", "misread_question"] }
- response: updated wrongAnswer with categories
- authorization: wrongAnswer ownership must be valid
- validation: 중복 key 금지, 존재하지 않는 key 포함 시 `400`

### GET /wrong-answers

query:
- studentId
- from
- to
- categoryKey (optional)
- authorization: studentId must belong to authenticated guardian

## 6. Dashboard (M3 MVP)

### GET /dashboard/overview

query:
- studentId (required)
- date (optional, `YYYY-MM-DD`, default=today)
- authorization: studentId must belong to authenticated guardian

response:
- progress:
  - recommendedPct
  - actualPct
  - coveredUnits
  - totalUnits
- mastery:
  - overallScorePct
  - recentAccuracyPct (recent 28 days)
  - difficultyWeightedAccuracyPct (difficulty null은 3으로 간주)
- summary:
  - totalAttempts
  - totalItems
  - wrongAnswers
  - asOfDate

rules:
- 학기 구간
  - 1학기: `YYYY-01-01` ~ `YYYY-06-30`
  - 2학기: `YYYY-07-01` ~ `YYYY-12-31`
- recommendedPct = `(학기 경과일 / 학기 총일수) * 100` (0~100 clamp)
- actualPct = `(학기 내 시도된 고유 단원 수 / 해당 학기 전체 단원 수) * 100`
- overallScorePct = `0.6*recentAccuracy + 0.25*consistency + 0.15*difficultyWeighted`
- consistency = `100 - 2*stddev(weeklyAccuracyPct)` (주간 데이터 2개 미만이면 recentAccuracy 사용)

### GET /dashboard/weakness

query:
- studentId (required)
- period (`weekly|monthly`, default=`weekly`)
- authorization: studentId must belong to authenticated guardian

response:
- weakUnits[]: `{ curriculumNodeId, unitName, attempts, accuracyPct, wrongCount }`
- categoryDistribution[]: `{ key, labelKo, count, ratio }`

rules:
- 기간 내 단원별 집계
- 후보 조건: `attempts >= 3`
- 정렬: `accuracyPct ASC`, tie-break `attempts DESC`, `unitName ASC`
- 반환: top 5

### GET /dashboard/trends

query:
- studentId (required)
- rangeStart (optional, `YYYY-MM-DD`)
- rangeEnd (optional, `YYYY-MM-DD`)
- authorization: studentId must belong to authenticated guardian

response:
- points[]: `{ weekStart, weekEnd, totalItems, correctItems, accuracyPct, masteryScorePct }`

defaults:
- 범위 미지정 시 최근 28일
- 주 단위 버킷(월요일 시작)으로 반환

## 7. Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

대표 에러 코드:
- `AUTH_REQUIRED`
- `AUTH_INVALID_CREDENTIALS`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `UNSUPPORTED_MEDIA_TYPE`
- `PAYLOAD_TOO_LARGE`
- `INTERNAL_SERVER_ERROR`

## 8. Security

- JWT 기반 인증
- 보호자-학생 데이터 접근 범위 검증 필수
- 업로드 파일 MIME/사이즈 제한

## 9. Versioning

- breaking change 시 `/api/v2` 추가
- v1은 3개월 안정화 후 변경 최소화
