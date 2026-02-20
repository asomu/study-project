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

## 3. Curriculum

### GET /curriculum

query:
- schoolLevel
- subject (default math)
- grade
- semester

response:
- 단원 트리 배열

## 4. Materials and Attempts

### POST /materials

- request: { studentId, title, publisher, subject, grade, semester }

### POST /attempts

- request: { studentId, materialId, attemptDate, notes }

### POST /attempts/{attemptId}/items

- request: [{ curriculumNodeId, problemNo, isCorrect, difficulty }]

## 5. Wrong Answers

### POST /wrong-answers

- request: { attemptItemId, memo }
- response: wrongAnswer

### POST /wrong-answers/{id}/image

- multipart form-data
- field: file
- response: { imagePath }

### PUT /wrong-answers/{id}/categories

- request: { categoryKeys: ["calculation_mistake", "misread_question"] }
- response: updated wrongAnswer with categories

### GET /wrong-answers

query:
- studentId
- from
- to
- categoryKey (optional)

## 6. Dashboard

### GET /dashboard/overview

query:
- studentId
- date (default today)

response:
- progress vs recommended timeline
- overall mastery
- weak units top N

### GET /dashboard/weakness

query:
- studentId
- period (weekly, monthly)

response:
- unit weakness list
- wrong category distribution

### GET /dashboard/trends

query:
- studentId
- rangeStart
- rangeEnd

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
