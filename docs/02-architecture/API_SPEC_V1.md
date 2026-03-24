# API Spec v1

- Version: v1.10-draft
- Date: 2026-03-23
- Base path: `/api/v1`
- Scope: Wrong-note-first + workbook-progress service

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
  - `grade` (required)
  - `semester` (`1 | 2`, required)
  - `curriculumNodeId` (required)
  - `reason` (required)
  - `studentMemo` (optional)
  - `studentWorkbookId` (optional)
  - `workbookTemplateStageId` (optional, `studentWorkbookId`가 있으면 required)
- response: `201 wrongNote`
- validation:
  - 사진 필수
  - `grade`는 학생 학교급 안에서 선택 가능한 학년이어야 함
  - 단원은 학생 학교급 + 선택한 대상 학년/선택 학기의 수학 단원이어야 함
  - `studentWorkbookId`가 있으면 학생에게 배정된 active workbook이어야 함
  - `workbookTemplateStageId`는 선택한 workbook template의 stage여야 함
  - workbook을 선택한 경우 workbook template의 `grade/semester`와 wrong-note 단원이 일치해야 함
  - 허용 MIME: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
  - 파일 시그니처 검증 필수
  - 업로드 제한: `UPLOAD_MAX_BYTES` 기본 5MB

### GET /student/wrong-notes

query:

- `grade`
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

note:

- 현재 UI의 기본 분포 시각화는 `/student/wrong-notes/chart`를 사용한다.
- `topUnits[]`는 호환용 additive 필드다.

### GET /student/wrong-notes/chart

query:

- `dimension` (`unit | reason`, required)
- `grade` (required)
- `semester` (required)

response:

- `student`
- `chart`
  - `dimension`
  - `grade`
  - `semester`
  - `bars[]`
    - `key`
    - `label`
    - `value`
    - `meta?`
  - `maxValue`
  - `totalCount`

### GET /student/wrong-notes/{id}

- response: `wrongNote`

### GET /student/wrong-notes/{id}/image

- response: binary image stream
- auth: student only
- rules:
  - `Student.loginUserId = session.userId` ownership 확인 필수
  - DB `image_path`가 storage key이면 repo 밖 저장소에서 조회
  - DB `image_path`가 `/uploads/wrong-notes/...` legacy 값이면 기존 repo public 경로를 호환 조회
  - 파일이 없으면 `404`

### PATCH /student/wrong-notes/{id}

- request:
  - `{ grade, curriculumNodeId, semester }`
  - `{ reason }`
  - `{ studentMemo }`
  - `{ studentWorkbookId, workbookTemplateStageId }`
  - above 조합 허용
- rules:
  - `grade`, `curriculumNodeId`, `semester`는 같이 보내야 한다
  - `studentWorkbookId`, `workbookTemplateStageId`는 같이 보내야 한다
  - workbook 연결 해제는 둘 다 `null`로 보내야 한다
  - 최소 1개 필드는 포함되어야 한다
- response: updated `wrongNote`

### POST /student/wrong-notes/{id}/image

- multipart form-data
- field: `file`
- response: `{ imagePath }`
- validation: 생성과 동일한 MIME/시그니처/용량 정책 적용
- note:
  - DB에는 storage key를 저장한다.
  - 응답 `imagePath`는 `/api/v1/student/wrong-notes/{id}/image` URL이다.

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

### GET /wrong-notes/chart

query:

- `studentId` (required)
- `dimension` (`unit | reason`, required)
- `grade` (required)
- `semester` (required)

response:

- student chart와 동일 shape

### GET /wrong-notes

query:

- `studentId` (required)
- `grade`
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

### GET /wrong-notes/{id}/image

query:

- `studentId` (required)

response:

- binary image stream
- auth: guardian only
- rules:
  - `Student.guardianUserId = session.userId` ownership 확인 필수
  - 파일이 없으면 `404`

### PUT /wrong-notes/{id}/feedback

- request: `{ text }`
- response: updated `wrongNote`
- rules:
  - 빈 문자열 저장 가능
  - 빈 문자열이면 기존 피드백을 비운다
  - 값이 있으면 `guardianFeedbackAt`, `guardianFeedbackByUserId`를 갱신한다

## 7. Workbook Templates and Progress

### GET /workbook-templates

- guardian only
- response:
  - `workbookTemplates[]`

### POST /workbook-templates

- guardian only
- request:
  - `title`
  - `publisher`
  - `schoolLevel`
  - `grade`
  - `semester`
  - `stages[]: { name, sortOrder }`
- rules:
  - 단계는 최소 1개, 최대 12개
  - 단계명은 trim 후 unique여야 한다
  - `grade`는 선택한 `schoolLevel`에 허용되는 범위여야 한다
- response: `201 workbookTemplate`

### PATCH /workbook-templates/{id}

- guardian only
- request:
  - `{ title? }`
  - `{ publisher? }`
  - `{ isActive? }`
- rules:
  - 최소 1개 필드 필요
  - v1에서는 stages 수정 불가
- response: updated `workbookTemplate`

### GET /student-workbooks

- guardian only
- query:
  - `studentId` (required)
- response:
  - `student`
  - `studentWorkbooks[]`

### POST /student-workbooks

- guardian only
- request:
  - `studentId`
  - `workbookTemplateId`
- rules:
  - guardian 소유 student만 가능
  - guardian 소유 template만 가능
  - inactive template은 배정할 수 없다
  - schoolLevel이 student와 일치해야 한다
  - 동일 template 중복 배정 불가
- response: `201 studentWorkbook`

### PATCH /student-workbooks/{id}

- guardian only
- request:
  - `{ isArchived }`
- response: updated `studentWorkbook`

### GET /student/workbook-progress/dashboard

- student only
- query:
  - `grade` (optional)
  - `studentWorkbookId` (optional)
- selection rules:
  - `studentWorkbookId`가 있으면 그 workbook만 조회하고, 없으면 `404`
  - 없고 `grade`가 있으면 그 학년에 맞는 배정 workbook만 선택
  - `grade`에 맞는 workbook이 없으면 `selectedWorkbook = null`
  - `grade`가 없을 때만 첫 active workbook 선택
- response:
  - `student`
  - `availableWorkbooks[]`
  - `selectedWorkbook | null`
  - `summary`
  - `unitBars[]`
  - `units[]`

### GET /workbook-progress/dashboard

- guardian only
- query:
  - `studentId` (required)
  - `grade` (optional)
  - `studentWorkbookId` (optional)
- selection rules:
  - student endpoint와 동일
- response:
  - student endpoint와 동일 shape

### PUT /student/workbook-progress

- student only
- request:
  - `studentWorkbookId`
  - `curriculumNodeId`
  - `workbookTemplateStageId`
  - `status` (`not_started | in_progress | completed`)
- rules:
  - workbook은 학생에게 배정된 active workbook이어야 한다
  - stage는 해당 workbook template에 속해야 한다
  - curriculumNode는 해당 workbook template의 `schoolLevel/grade/semester` 범위 안이어야 한다
- response:
  - `row`

### PUT /workbook-progress

- guardian only
- request:
  - student endpoint와 동일
- rules:
  - workbook은 guardian 소유 학생에게 배정된 active workbook이어야 한다
- response:
  - `row`

## 8. Wrong Note Response Shape

### wrongNote

```json
{
  "id": "uuid",
  "imagePath": "/api/v1/student/wrong-notes/uuid/image",
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
  },
  "workbook": {
    "studentWorkbookId": "student-workbook-id",
    "templateId": "workbook-template-id",
    "title": "개념원리 베이직 2-1",
    "publisher": "개념원리",
    "stageId": "workbook-stage-id",
    "stageName": "핵심문제 익히기"
  }
}
```

`feedback`가 없으면 `null`.
`workbook`이 없으면 `null`.

note:

- DB의 `wrong_notes.image_path`는 storage key를 저장한다.
- API의 `imagePath`는 브라우저가 바로 사용할 수 있는 guarded image URL이다.

### wrongNoteChart

```json
{
  "student": {
    "id": "student-id",
    "name": "학생 1",
    "schoolLevel": "middle",
    "grade": 1
  },
  "chart": {
    "dimension": "unit",
    "grade": 2,
    "semester": 1,
    "bars": [
      {
        "key": "curriculum-node-id",
        "label": "유리수와 순환소수",
        "value": 3,
        "meta": {
          "curriculumNodeId": "curriculum-node-id",
          "unitCode": "M2-S1-U1"
        }
      }
    ],
    "maxValue": 3,
    "totalCount": 4
  }
}
```

### workbookTemplate

```json
{
  "id": "template-id",
  "title": "개념원리 베이직 2-1",
  "publisher": "개념원리",
  "schoolLevel": "middle",
  "grade": 2,
  "semester": 1,
  "isActive": true,
  "stages": [
    {
      "id": "stage-id-1",
      "name": "개념원리 이해",
      "sortOrder": 0
    },
    {
      "id": "stage-id-2",
      "name": "핵심문제 익히기",
      "sortOrder": 1
    }
  ]
}
```

### studentWorkbook

```json
{
  "id": "student-workbook-id",
  "studentId": "student-id",
  "isArchived": false,
  "template": {
    "id": "template-id",
    "title": "개념원리 베이직 2-1",
    "publisher": "개념원리",
    "schoolLevel": "middle",
    "grade": 2,
    "semester": 1,
    "isActive": true,
    "stages": [
      {
        "id": "stage-id-1",
        "name": "개념원리 이해",
        "sortOrder": 0
      }
    ]
  }
}
```

### workbookProgressDashboard

```json
{
  "student": {
    "id": "student-id",
    "name": "학생 1",
    "schoolLevel": "middle",
    "grade": 1
  },
  "availableWorkbooks": [
    {
      "id": "student-workbook-id",
      "studentId": "student-id",
      "isArchived": false,
      "template": {
        "id": "template-id",
        "title": "개념원리 베이직 2-1",
        "publisher": "개념원리",
        "schoolLevel": "middle",
        "grade": 2,
        "semester": 1,
        "isActive": true,
        "stages": [
          {
            "id": "stage-id-1",
            "name": "개념원리 이해",
            "sortOrder": 0
          }
        ]
      }
    }
  ],
  "selectedWorkbook": {
    "studentWorkbookId": "student-workbook-id",
    "templateId": "template-id",
    "title": "개념원리 베이직 2-1",
    "publisher": "개념원리",
    "grade": 2,
    "semester": 1,
    "stages": [
      {
        "id": "stage-id-1",
        "name": "개념원리 이해",
        "sortOrder": 0
      }
    ]
  },
  "summary": {
    "totalSteps": 32,
    "notStartedCount": 20,
    "inProgressCount": 7,
    "completedCount": 5,
    "completedPct": 16
  },
  "unitBars": [
    {
      "curriculumNodeId": "node-id",
      "unitName": "유리수와 순환소수",
      "completedSteps": 2,
      "totalSteps": 4
    }
  ],
  "units": [
    {
      "curriculumNodeId": "node-id",
      "unitName": "유리수와 순환소수",
      "stageStates": [
        {
          "workbookTemplateStageId": "stage-id-1",
          "stageName": "개념원리 이해",
          "status": "completed",
          "lastUpdatedAt": "2026-03-22T06:10:00.000Z"
        }
      ]
    }
  ]
}
```

## 9. Dashboard Rules

- 통계는 `wrong_notes.deleted_at is null`만 기준으로 계산한다.
- `recent30DaysNotes`는 오늘 포함 최근 30일 기준이다.
- `feedbackCompletedNotes`는 `guardianFeedbackAt is not null` 기준이다.
- `topUnits`는 최대 5개 반환하는 호환용 분포 필드다.
- `GET */wrong-notes/chart?dimension=unit`은 선택 학년/학기의 전체 단원을 0건까지 포함한다.
- `GET */wrong-notes/chart?dimension=reason`은 `단순 연산 실수 -> 문제 잘못 읽음 -> 문제 이해 못함` 고정 순서를 유지한다.
- 리스트 기본 정렬은 `createdAt DESC`.
- workbook progress dashboard는 `selectedWorkbook`의 전체 단원 x 전체 단계 조합을 기준으로 matrix를 만든다.
- 저장 row가 없는 셀은 `not_started`로 렌더링한다.
- workbook progress 상태 변경은 row 단위 refreshed payload를 반환한다.

## 10. Legacy Note

- legacy 페이지 URL(`/records/new`, `/study/content`, `/study/reviews`, `/wrong-answers/manage`, `/student/progress`, `/student/study/session`, `/student/wrong-answers`)은 redirect shim만 유지한다.
- legacy API endpoint(`wrong-answers`, `dashboard/overview|weakness|trends|study-overview`, `student/study/*`, `study/*`, `attempts`, `materials`)는 현재 지원하지 않으며 `404` 대상이다.
- legacy 이미지 호환은 `GET */wrong-notes/{id}/image`에서 `/uploads/wrong-notes/...` read-only 조회만 유지한다.
