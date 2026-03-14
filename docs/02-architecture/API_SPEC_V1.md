# API Spec v1 (Draft)

- Version: v1.6-draft
- Date: 2026-03-15
- Base path: `/api/v1`

## 1. Auth

### POST /auth/login

- request: `{ identifier, password }`
- compatibility:
  - 기존 `{ email, password }` 요청도 허용한다.
- response: `{ accessToken, user }`
- note:
  - `accessToken` 필드는 v1 호환성 때문에 유지한다.
  - 웹 클라이언트는 `HttpOnly` 쿠키를 사용하며, `accessToken`은 deprecated 취급한다.
  - 식별자 조회는 `user_credential_identifiers` 기준으로 단일 매핑된다.

### POST /auth/signup

- request: `{ name, email, password, confirmPassword, acceptedTerms }`
- response: `{ accessToken, user }`
- note:
  - 보호자 계정만 직접 가입한다.
  - 가입 성공 시 즉시 세션 쿠키를 발급한다.
  - 가입 이메일은 다른 계정의 `loginId`와도 충돌할 수 없다.

### POST /auth/student-activate

- request: `{ inviteCode, loginId, password, displayName }`
- response: `{ accessToken, user }`
- validation:
  - 초대코드는 1회 사용 후 만료
  - 만료/사용 완료 코드는 각각 `410 EXPIRED`, `409 CONFLICT`
  - `loginId`는 전체 사용자 기준 unique
  - `loginId`는 다른 계정의 `email`과도 충돌할 수 없다.

### POST /auth/logout

- response: `204`

## 2. Student

### GET /students

- 보호자 계정의 학생 목록 조회

### POST /students

- request: `{ name, schoolLevel, grade }`
- response: `student`

### POST /students/{id}/invite

- 보호자 계정이 학생 초대코드를 발급
- response: `{ studentId, studentName, inviteCode, expiresAt }`
- validation:
  - 아직 활성화되지 않은 학생(`Student.loginUserId = null`)만 허용한다.
  - 이미 활성화된 학생이면 `409 CONFLICT`와 함께 `invite/reset` 사용을 안내한다.

### POST /students/{id}/invite/reset

- 활성 학생의 현재 로그인 연결을 해제하고 새 초대코드를 재발급한다.
- inactive 학생에도 재발급 용도로 사용할 수 있다.
- response: `{ studentId, studentName, inviteCode, expiresAt }`
- side effects:
  - 기존 학생 로그인 계정은 `isActive=false`로 전환된다.
  - 기존 로그인 식별자 매핑은 제거되어 같은 `loginId` 재사용이 가능해진다.
  - `Student.loginUserId`는 `null`로 돌아간다.

## 2.1 Authorization Guard

- 보호자 전용 API
  - `/students`
  - `/materials`
  - `/attempts`
  - `/wrong-answers`
  - `/dashboard/*`
  - `/study/reviews*`
  - `/study/progress*`
- 학생 전용 API
  - `/student/dashboard/*`
  - `/student/study/*`
  - `/student/wrong-answers*`

- 서버는 JWT 기반 사용자 기준으로 허용된 `studentId` 목록을 계산한다.
- 요청 본문/쿼리의 `studentId`가 허용 목록 밖이면 `403 FORBIDDEN`을 반환한다.
- `attemptId`, `materialId`, `wrongAnswerId`, `practiceSetId` 경유 요청도 소유권 체인을 검증한다.
- 클라이언트 입력값만으로 학생 소유권을 신뢰하지 않는다.
- 학생 계정은 `Student.loginUserId`로 연결된 자기 학생 1건만 조회 가능하다.
- 학생 학습 세션/개념/진도 API는 현재 학기(`1학기=1~6월`, `2학기=7~12월`) 데이터만 노출한다.

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
- 적용 버전 메타 정보 `{ curriculumVersion, effectiveFrom, effectiveTo }`

validation:
- `asOfDate` 누락/형식 오류 시 `400 VALIDATION_ERROR`
- `curriculumVersion` 명시 시 해당 버전을 우선 조회
- 명시 버전이 없으면 `asOfDate` 기준 활성 버전 중 최신 버전 선택
- 조회 결과가 없으면 `404 NOT_FOUND`

## 4. Materials and Attempts

### POST /materials

- request: `{ studentId, title, publisher, subject, grade, semester }`
- authorization: `studentId` must belong to authenticated guardian
- validation: M2는 `subject=math`만 허용
- response: `201 material`

### POST /attempts

- request: `{ studentId, materialId, attemptDate, notes }`
- authorization: `studentId/materialId` ownership chain must be valid
- validation: `materialId`와 `studentId` 체인이 일치해야 함
- response: `201 attempt`

### POST /attempts/{attemptId}/items

- request: `{ items: [{ curriculumNodeId, problemNo, isCorrect, difficulty }] }`
- authorization: `attemptId` ownership must be valid
- validation:
  - payload 내부 `problemNo` 중복 금지
  - 기존 attempt 문항과 `problemNo` 충돌 금지
  - `difficulty`는 `1..5`
  - `curriculumNodeId` 유효성 검증
- response: `201 { attemptId, items }`

## 5. Wrong Answers (Guardian-owned M2 flow)

### POST /wrong-answers

- request: `{ attemptItemId, memo }`
- response: `wrongAnswer`
- authorization: `attemptItemId` ownership must be valid
- validation: `isCorrect=false` 문항에서만 생성/업데이트 가능

### POST /wrong-answers/{id}/image

- multipart form-data
- field: `file`
- response: `{ imagePath }`
- authorization: wrongAnswer ownership must be valid
- storage:
  - 저장 위치: `public/uploads/wrong-answers`
  - 허용 MIME: `image/jpeg`, `image/png`, `image/webp`
  - 업로드 제한: `UPLOAD_MAX_BYTES` (기본 5MB)

### PUT /wrong-answers/{id}/categories

- request: `{ categoryKeys: ["calculation_mistake", "misread_question"] }`
- response: updated wrongAnswer with categories
- authorization: wrongAnswer ownership must be valid
- validation: 중복 key 금지, 존재하지 않는 key 포함 시 `400`

### GET /wrong-answers

query:
- studentId
- from
- to
- categoryKey (optional)
- authorization: `studentId` must belong to authenticated guardian

## 6. Dashboard (M3 MVP)

### GET /dashboard/overview

query:
- studentId (required)
- date (optional, `YYYY-MM-DD`, default=today)
- authorization: `studentId` must belong to authenticated guardian

response:
- progress:
  - recommendedPct
  - actualPct
  - coveredUnits
  - totalUnits
- mastery:
  - overallScorePct
  - recentAccuracyPct (recent 28 days)
  - difficultyWeightedAccuracyPct (`difficulty null`은 `3`으로 간주)
- summary:
  - totalAttempts
  - totalItems
  - wrongAnswers
  - asOfDate

rules:
- 학기 구간
  - 1학기: `YYYY-01-01` ~ `YYYY-06-30`
  - 2학기: `YYYY-07-01` ~ `YYYY-12-31`
- recommendedPct = `(학기 경과일 / 학기 총일수) * 100` (`0~100` clamp)
- actualPct = `(학기 내 시도된 고유 단원 수 / 해당 학기 전체 단원 수) * 100`
- overallScorePct = `0.6*recentAccuracy + 0.25*consistency + 0.15*difficultyWeighted`
- consistency = `100 - 2*stddev(weeklyAccuracyPct)` (주간 데이터 2개 미만이면 recentAccuracy 사용)

### GET /dashboard/weakness

query:
- studentId (required)
- period (`weekly|monthly`, default=`weekly`)
- authorization: `studentId` must belong to authenticated guardian

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
- authorization: `studentId` must belong to authenticated guardian

response:
- points[]: `{ weekStart, weekEnd, totalItems, correctItems, accuracyPct, masteryScorePct }`

defaults:
- 범위 미지정 시 최근 28일
- 주 단위 버킷(월요일 시작)으로 반환

### GET /dashboard/study-overview

query:
- studentId (required)
- date (optional, `YYYY-MM-DD`, default=today)
- authorization: `studentId` must belong to authenticated guardian

response:
- student: `{ id, name, schoolLevel, grade }`
- summary:
  - pendingReviews
  - reviewNeededUnits
  - inProgressUnits
  - recentStudyMinutes7d
  - submittedSessions7d
- progressSummary: `{ planned, in_progress, review_needed, completed }`
- recommendedActions[]:
  - `{ kind, title, description, href?, sessionId?, curriculumNodeId?, practiceSetId? }`
- reviewQueuePreview[]:
  - `{ attemptId, submittedAt, elapsedSeconds, practiceSetTitle, unitName, wrongItems, hasReview }`
- attentionUnits[]:
  - `{ curriculumNodeId, unitName, status, lastStudiedAt, reviewedAt, practiceSetTitle, hasConcept }`

rules:
- 현재 학기 단원 + `StudentUnitProgress` 기준으로 `progressSummary`, `attentionUnits`를 계산한다.
- 최근 활동 기준은 최근 7일이다.
- `recentStudyMinutes7d`는 최근 7일 제출된 practice session의 `elapsedSeconds` 합계를 분 단위로 내린 값이다.
- `pendingReviews`는 제출 완료 + `studyReview` 미존재 session 수다.
- `attentionUnits`는 `completed`를 제외하고 `review_needed -> in_progress -> planned` 우선순위로 정렬하며 최대 5개만 반환한다.
- `recommendedActions`는 아래 우선순위를 고정하고 최대 3개만 반환한다.
  - 미리뷰 제출 세션
  - `review_needed` 단원
  - 최근 7일 창 밖으로 밀린 `in_progress` 단원
  - 연습 세트가 연결된 `planned` 단원
- action/review preview CTA는 `/study/reviews?studentId=...` deep-link를 사용한다.

## 6.1 Student Study Loop (M6)

### GET /student/study/board

- student role only
- response:
  - student
  - dailyMission: `{ practiceSetId, title, curriculumNodeId, unitName, problemCount, progressStatus, reason } | null`
  - practiceSets[]: `{ id, title, description, curriculumNodeId, unitName, problemCount, skillTags, progressStatus }`
  - progressSummary: `{ planned, in_progress, review_needed, completed }`
  - progress[]: `{ curriculumNodeId, unitName, status, note, lastStudiedAt, reviewedAt, hasConcept, practiceSetId, practiceSetTitle }`
  - recentSessions[]
  - latestFeedback[]
- rules:
  - 현재 학기 단원만 기반으로 daily mission과 progress를 계산한다.
  - daily mission 우선순위는 `review_needed -> in_progress -> planned -> completed` 순이다.

### GET /student/study/concepts/{curriculumNodeId}

- student role only
- response:
  - lesson: `{ id, curriculumNodeId, unitName, title, summary, content }`
  - recommendedPracticeSet: `{ id, title, problemCount } | null`
- rules:
  - 로그인 학생의 학교급/학년/현재 학기에 일치하는 개념 자료만 조회한다.
  - 개념 자료가 없으면 `404 NOT_FOUND`.

### GET /student/study/sessions

- student role only
- response:
  - sessions[]: 최근 practice 시도 요약 배열
- rules:
  - 로그인 학생 본인 세션만 반환한다.
  - 정렬은 `submittedAt DESC`, `startedAt DESC`.

### POST /student/study/sessions

- request: `{ practiceSetId }`
- response: `{ session }`
- session payload:
  - summary fields: `id`, `attemptDate`, `startedAt`, `submittedAt`, `elapsedSeconds`, `sourceType`
  - practiceSet: `{ id, title, description, curriculumNodeId, unitName, problems[] }`
  - review, workArtifact, result
- rules:
  - 학생 role only
  - 현재 학기 + 로그인 학생의 학교급/학년과 일치하는 `PracticeSet`만 시작 가능
  - 동일 `practiceSetId`에 제출되지 않은 open session이 있으면 재사용하고 `200`
  - 새 세션이면 숨김 system `Material`을 지연 생성하고 `201`

### POST /student/study/sessions/{id}/submit

- request:
  - `elapsedSeconds?`
  - `canvasImageDataUrl?` (`data:image/png;base64,...`)
  - `answers: [{ practiceProblemId, studentAnswer }]`
- response:
  - `session`
  - `result: { totalProblems, correctItems, wrongItems, progressStatus }`
- rules:
  - 학생 role only
  - 로그인 학생 본인 practice session만 제출 가능
  - 이미 제출된 세션/문항이 있으면 `409 CONFLICT`
  - `practiceProblemId`는 해당 세션의 `PracticeSet` 문제에 속해야 함
  - 자동채점 대상은 객관식/단답형만 지원
  - 오답 문항은 기존 `WrongAnswer` 파이프라인으로 생성한다
  - 캔버스는 PNG snapshot 1장만 저장하며 저장 위치는 `STUDY_UPLOAD_DIR` (기본 `public/uploads/study-work`)
  - `progressStatus`는 오답 존재 시 `review_needed`, 전부 정답이면 `completed`

### GET /student/wrong-answers

query:
- from (optional)
- to (optional)
- categoryKey (optional)

response:
- wrongAnswers[]

rules:
- student role only
- 로그인 학생 본인의 오답만 조회 가능
- `from/to`는 date-only string, `from > to`면 `400`

### PUT /student/wrong-answers/{id}

- request: `{ memo?, categoryKeys? }`
- response: updated wrongAnswer
- rules:
  - student role only
  - 최소 하나(`memo` 또는 `categoryKeys`)는 필요
  - 중복 category key 금지
  - 존재하지 않는 category key 포함 시 `400`
  - 빈 문자열 memo는 `null`로 정리한다

### POST /student/wrong-answers/{id}/image

- multipart form-data
- field: `file`
- response: `{ imagePath }`
- rules:
  - student role only
  - 허용 MIME / 크기 / 시그니처 검증 규칙은 guardian wrong-answer 업로드와 동일
  - 저장 대상은 기존 wrong-answer image 필드를 재사용한다

## 6.2 Guardian Study Review (M6)

### GET /study/reviews

query:
- studentId (required)

response:
- student
- reviewQueue[]

rules:
- guardian role only
- `studentId` 소유권 검증 필수
- review queue 정렬:
  - 미리뷰 세션 우선
  - 그 다음 최근 제출 순
  - 동률이면 오답 수 많은 순

### POST /study/reviews/{sessionId}

- request: `{ feedback, progressStatus }`
- response: `{ review }`
- rules:
  - guardian role only
  - 제출 완료된 practice session만 리뷰 가능
  - 세션 소유 학생이 로그인 보호자의 학생이어야 함
  - 허용 progress transition만 반영
  - 저장 시 `StudyReview`, `StudentUnitProgress`, 해당 세션의 `WrongAnswer.reviewedAt`를 함께 갱신

### GET /study/progress

query:
- studentId (required)

response:
- student
- summary: `{ planned, in_progress, review_needed, completed }`
- progress[]

rules:
- guardian role only
- 현재 학기 단원 기준으로만 계산
- `studentId` 소유권 검증 필수

### PUT /study/progress/{curriculumNodeId}

- request: `{ studentId, status, note? }`
- response: progress item
- rules:
  - guardian role only
  - 현재 학기 + 학생 학교급/학년과 일치하는 `curriculumNodeId`만 허용
  - 허용 progress transition만 반영
- `note` 빈 문자열은 `null`로 정리한다
  - `updatedByGuardianUserId`와 `reviewedAt`를 함께 기록한다

## 6.3 Study Content Authoring (M7)

### GET /study/content

query:
- `schoolLevel` (required)
- `grade` (required)
- `semester` (required)

response:
- `curriculumVersion`
- `curriculumNodes[]`: `{ id, curriculumVersion, unitCode, unitName, sortOrder }`
- `practiceSets[]`
- `conceptLessons[]`

rules:
- guardian/admin role only
- `subject`는 `math`로 고정한다
- 학생 화면과 달리 `activeFrom/activeTo` 현재 날짜 제약 없이, 선택한 학기의 최신 `curriculumVersion`을 기준으로 조회한다

### POST /study/content/practice-sets

request:
- `title`
- `description?`
- `schoolLevel`
- `grade`
- `semester`
- `curriculumNodeId`
- `sortOrder`
- `isActive`
- `problems[]: { problemNo, type, prompt, choices, correctAnswer, explanation?, skillTags, difficulty }`

response:
- `practiceSet`

rules:
- guardian/admin role only
- `curriculumNodeId`는 `schoolLevel/grade/semester/math`와 일치해야 한다
- `problemNo`는 세트 내부 unique
- `single_choice`는 `choices >= 2`이고 `correctAnswer`가 `choices` 중 하나여야 한다
- `short_answer`는 `choices`를 저장하지 않는다
- `difficulty`는 `1..5`
- `skillTags`는 trim/lowercase/dedupe 규칙으로 정규화한다

### PUT /study/content/practice-sets/{id}

request:
- create와 동일

response:
- `practiceSet`

rules:
- guardian/admin role only
- attempt가 1건 이상 존재하는 used set은 구조 수정 금지
- used set에서 허용되는 수정 범위: `title`, `description`, `sortOrder`, `isActive`
- used set의 `schoolLevel`, `grade`, `semester`, `curriculumNodeId`, `problems` 변경 시 `409 CONFLICT`

### PUT /study/content/practice-sets/{id}/activation

request:
- `{ isActive }`

response:
- `practiceSet`

rules:
- guardian/admin role only
- hard delete 없이 노출 여부만 토글한다
- 비활성 세트는 학생 `/student/study/board`와 `/student/study/session` 후보에서 제외된다

### PUT /study/content/concepts/{curriculumNodeId}

request:
- `title`
- `summary?`
- `content.blocks[]`

response:
- `conceptLesson`

rules:
- guardian/admin role only
- `curriculumNodeId`당 1개 lesson만 유지한다
- 허용 block type:
  - `headline`
  - `visual_hint`
  - `steps`
  - `table`
- `steps.items`는 1개 이상
- `table.rows`는 2열 row 배열만 허용

### DELETE /study/content/concepts/{curriculumNodeId}

response:
- `204 No Content`

rules:
- guardian/admin role only
- lesson이 없으면 `404 NOT_FOUND`
- 삭제 후 학생 `/student/progress`와 `/student/study/concepts/{curriculumNodeId}`에서 즉시 반영되어야 한다

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
- `AUTH_ACCOUNT_INACTIVE`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `EXPIRED`
- `UNSUPPORTED_MEDIA_TYPE`
- `PAYLOAD_TOO_LARGE`
- `INTERNAL_SERVER_ERROR`

## 8. Security

- JWT 기반 인증
- 보호자-학생 데이터 접근 범위 검증 필수
- 학생 본인 세션/오답에 대해서도 소유권 체인 검증 필수
- 업로드 파일 MIME/사이즈/파일 시그니처 제한
- study session submit/review는 역할별 route를 분리해 guardian/student 경계를 고정

## 9. Versioning

- breaking change 시 `/api/v2` 추가
- v1은 3개월 안정화 후 변경 최소화

## 10. Student Dashboard

### GET /student/dashboard/overview

- student role only
- response:
  - student
  - today
  - recent7Days
  - focus.weakUnits
  - review.recentWrongAnswers
  - summary
  - nextAction

### GET /student/dashboard/trends

- student role only
- response:
  - points[]: 최근 28일 기준 주간 버킷

## 11. Deferred After MVP

- 다운로드/공유 가능한 리포트 산출물 API는 M5에서 별도 정의한다.
- 약점 우선순위 추천 API는 M5에서 별도 정의한다.
- content authoring draft/versioning/publish workflow는 M5 이후 별도 단계에서 정의한다.
- OCR, 자유형 필기 인식, stroke replay, 공동 편집은 v1 범위에서 제외한다.
