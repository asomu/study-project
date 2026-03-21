# API Spec v1

- Version: v1.7-draft
- Date: 2026-03-21
- Base path: `/api/v1`
- Scope: Wrong-note-first service

## 1. Auth

### POST /auth/login

- request: `{ identifier, password }`
- compatibility:
  - 기존 `{ email, password }`도 허용
- response: `{ accessToken, user }`
- note:
  - 실제 웹은 HttpOnly 쿠키를 사용한다.

### POST /auth/signup

- request: `{ name, email, password, confirmPassword, acceptedTerms }`
- response: `{ accessToken, user }`

### POST /auth/student-activate

- request: `{ inviteCode, loginId, password, displayName }`
- response: `{ accessToken, user }`

### POST /auth/logout

- response: `204`

## 2. Students

### GET /students

- guardian 전용
- response: `{ students: [{ id, name, schoolLevel, grade }] }`

### POST /students

- guardian 전용
- request: `{ name, schoolLevel, grade }`
- response: `student`

### POST /students/{id}/invite

- guardian 전용
- response: `{ studentId, studentName, inviteCode, expiresAt }`

### POST /students/{id}/invite/reset

- guardian 전용
- response: `{ studentId, studentName, inviteCode, expiresAt }`

## 3. Curriculum

### GET /curriculum

query:

- `schoolLevel`
- `subject` (default `math`)
- `grade`
- `semester`
- `asOfDate` (required, `YYYY-MM-DD`)
- `curriculumVersion` (optional)

response:

- `nodes[]: { id, unitCode, unitName }`
- `meta: { curriculumVersion, effectiveFrom, effectiveTo }`

validation:

- `asOfDate` 누락/형식 오류 시 `400`
- 결과가 없으면 `404`

## 4. Authorization Rules

보호자 전용:

- `/students*`
- `/wrong-notes*`
- `/dashboard`

학생 전용:

- `/student/wrong-notes*`
- `/student/dashboard`

공통 규칙:

- 학생은 `Student.loginUserId = session.userId`인 자기 데이터만 접근 가능
- 보호자는 `Student.guardianUserId = session.userId`인 자기 학생 데이터만 접근 가능
- `wrongNoteId` 기반 요청도 ownership chain 검증을 통과해야 한다

## 5. Wrong Notes: Student

### POST /student/wrong-notes

- multipart form-data
- fields:
  - `file` (required)
  - `semester` (`1 | 2`, required)
  - `curriculumNodeId` (required)
  - `reason` (required)
  - `studentMemo` (optional)
- response: `201 wrongNote`
- validation:
  - 사진 필수
  - 단원은 학생 학교급/학년/선택 학기의 수학 단원이어야 함
  - 허용 MIME: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
  - 파일 시그니처 검증 필수
  - 업로드 제한: `UPLOAD_MAX_BYTES` 기본 5MB

### GET /student/wrong-notes

query:

- `semester`
- `curriculumNodeId`
- `reason`
- `from`
- `to`
- `hasFeedback`
- `page` (default `1`)
- `pageSize` (default `12`, max `50`)

response:

- `student: { id, name, schoolLevel, grade }`
- `pagination: { page, pageSize, totalItems, totalPages }`
- `wrongNotes: wrongNote[]`

### GET /student/wrong-notes/dashboard

response:

- `student`
- `summary`
  - `totalNotes`
  - `recent30DaysNotes`
  - `feedbackCompletedNotes`
  - `reasonCounts`
- `reasonDistribution[]`
- `topUnits[]`

### GET /student/wrong-notes/{id}

- response: `wrongNote`

### PATCH /student/wrong-notes/{id}

- request:
  - `{ curriculumNodeId, semester }`
  - `{ reason }`
  - `{ studentMemo }`
  - above 조합 허용
- rules:
  - `curriculumNodeId`와 `semester`는 같이 보내야 한다
  - 최소 1개 필드는 포함되어야 한다
- response: updated `wrongNote`

### POST /student/wrong-notes/{id}/image

- multipart form-data
- field: `file`
- response: `{ imagePath }`
- validation: 생성과 동일한 MIME/시그니처/용량 정책 적용

### DELETE /student/wrong-notes/{id}

- response: `204`
- side effect:
  - `deletedAt`만 채우는 soft delete

## 6. Wrong Notes: Guardian

### GET /wrong-notes/dashboard

query:

- `studentId` (required)

response:

- student 대시보드와 동일 shape

### GET /wrong-notes

query:

- `studentId` (required)
- `semester`
- `curriculumNodeId`
- `reason`
- `from`
- `to`
- `hasFeedback`
- `page`
- `pageSize`

response:

- student 리스트와 동일 shape

### GET /wrong-notes/{id}

query:

- `studentId` (required)

response:

- `wrongNote`

### PUT /wrong-notes/{id}/feedback

- request: `{ text }`
- response: updated `wrongNote`
- rules:
  - 빈 문자열 저장 가능
  - 빈 문자열이면 기존 피드백을 비운다
  - 값이 있으면 `guardianFeedbackAt`, `guardianFeedbackByUserId`를 갱신한다

## 7. Wrong Note Response Shape

### wrongNote

```json
{
  "id": "uuid",
  "imagePath": "/uploads/wrong-notes/uuid.png",
  "studentMemo": "부호를 잘못 봤어요.",
  "createdAt": "2026-03-21T09:00:00.000Z",
  "updatedAt": "2026-03-21T09:00:00.000Z",
  "curriculum": {
    "grade": 1,
    "semester": 1,
    "curriculumNodeId": "node-id",
    "unitName": "정수와 유리수"
  },
  "reason": {
    "key": "calculation_mistake",
    "labelKo": "단순 연산 실수"
  },
  "feedback": {
    "text": "조건에 밑줄을 쳐보자.",
    "updatedAt": "2026-03-21T10:30:00.000Z",
    "guardianUserId": "guardian-user-id"
  }
}
```

`feedback`가 없으면 `null`.

## 8. Dashboard Rules

- 통계는 `wrong_notes.deleted_at is null`만 기준으로 계산한다.
- `recent30DaysNotes`는 오늘 포함 최근 30일 기준이다.
- `feedbackCompletedNotes`는 `guardianFeedbackAt is not null` 기준이다.
- `topUnits`는 최대 5개 반환한다.
- 리스트 기본 정렬은 `createdAt DESC`.

## 9. Legacy Note

기존 `wrong-answers`, `dashboard/overview`, `dashboard/weakness`, `dashboard/trends`, `student/study/*` 계약은 코드베이스에 남아 있지만 현재 WrongNote 전용 제품의 기본 계약에는 포함하지 않는다.
