# API Spec v1 (Draft)

- Version: v1.0-draft
- Date: 2026-02-20
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

## 4. Materials and Attempts

### POST /materials

- request: { studentId, title, publisher, subject, grade, semester }
- authorization: studentId must belong to authenticated guardian

### POST /attempts

- request: { studentId, materialId, attemptDate, notes }
- authorization: studentId/materialId ownership chain must be valid

### POST /attempts/{attemptId}/items

- request: [{ curriculumNodeId, problemNo, isCorrect, difficulty }]
- authorization: attemptId ownership must be valid

## 5. Wrong Answers

### POST /wrong-answers

- request: { attemptItemId, memo }
- response: wrongAnswer
- authorization: attemptItemId ownership must be valid

### POST /wrong-answers/{id}/image

- multipart form-data
- field: file
- response: { imagePath }
- authorization: wrongAnswer ownership must be valid

### PUT /wrong-answers/{id}/categories

- request: { categoryKeys: ["calculation_mistake", "misread_question"] }
- response: updated wrongAnswer with categories
- authorization: wrongAnswer ownership must be valid

### GET /wrong-answers

query:
- studentId
- from
- to
- categoryKey (optional)
- authorization: studentId must belong to authenticated guardian

## 6. Dashboard

### GET /dashboard/overview

query:
- studentId
- date (default today)
- authorization: studentId must belong to authenticated guardian

response:
- progress vs recommended timeline
- overall mastery
- weak units top N

### GET /dashboard/weakness

query:
- studentId
- period (weekly, monthly)
- authorization: studentId must belong to authenticated guardian

response:
- unit weakness list
- wrong category distribution

### GET /dashboard/trends

query:
- studentId
- rangeStart
- rangeEnd
- authorization: studentId must belong to authenticated guardian

response:
- mastery time series

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

## 8. Security

- JWT 기반 인증
- 보호자-학생 데이터 접근 범위 검증 필수
- 업로드 파일 MIME/사이즈 제한

## 9. Versioning

- breaking change 시 `/api/v2` 추가
- v1은 3개월 안정화 후 변경 최소화
