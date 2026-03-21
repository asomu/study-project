# User E2E Manual Checklist

- Last Updated: 2026-03-21
- Scope: `/Users/mark/Documents/project/study-project/apps/web`
- Audience: 제품 오너 / 운영자 / 수동 QA
- Goal: 보호자 가입/로그인, 학생 오답 업로드, 보호자 피드백, 학생 재확인까지 현재 WrongNote 전용 핵심 루프를 수동 검증한다.

## 1. 사용 전제

- 현재 기본 제품 경험은 학생 `/student/dashboard`, 보호자 `/dashboard`다.
- 레거시 `records/new`, `student/study/session`, `student/progress`, `study/reviews`, `study/content`, `wrong-answers/manage`는 현재 제품 기준 비활성 또는 리다이렉트 대상이다.
- 이 문서는 로컬 개발 환경 기준이다.

## 2. 권장 준비 순서

1. 의존성 설치

```bash
pnpm install
```

2. 환경 변수 준비

```bash
cp apps/web/.env.example apps/web/.env
```

3. PostgreSQL 실행

```bash
docker compose -f infra/docker/docker-compose.local.yml up -d
```

4. 로컬 DB 초기화

```bash
pnpm -C apps/web exec prisma migrate reset --force
```

5. 개발 서버 실행

```bash
pnpm -C apps/web dev
```

6. 브라우저에서 열기

- [login](http://127.0.0.1:3000/login)

## 3. 테스트 계정과 기본 데이터

- 보호자 계정
  - email: `guardian@example.com`
  - password: `Guardian123!`
- 기본 학생
  - 이름: `기본 학생`
  - 학교급/학년: `middle-1학년`
- 기본 단원
  - `소인수분해`
  - `정수와 유리수`

## 4. 업로드 테스트용 파일 준비

정상 업로드용:

- 실제 `.png`, `.jpg`, `.webp`, `.heic`, `.heif` 이미지 1개

실패 업로드용:

```bash
mkdir -p ~/Desktop/study-manual-test
printf 'not-a-real-png' > ~/Desktop/study-manual-test/fake.png
```

## 5. 권장 실행 순서

1. 시나리오 A: 로그인과 홈 진입
2. 시나리오 B: 학생 오답 업로드
3. 시나리오 C: 학생 상세 수정/이미지 교체/삭제
4. 시나리오 D: 보호자 대시보드 조회와 피드백 저장
5. 시나리오 E: 학생이 피드백 재확인
6. 시나리오 F: 잘못된 이미지 업로드 실패
7. 시나리오 G: 레거시 URL 리다이렉트 확인

## 6. 상세 시나리오

### 시나리오 A. 로그인과 홈 진입

목적:

- 보호자/학생이 각자 오답노트 홈으로 진입하는지 확인

단계:

1. `/login` 진입
2. 보호자 계정으로 로그인
3. `/dashboard` 진입 확인
4. 로그아웃
5. 학생 계정으로 로그인
6. `/student/dashboard` 진입 확인

기대 결과:

- 보호자는 `오답 대시보드`
- 학생은 `오답노트 홈`

### 시나리오 B. 학생 오답 업로드

목적:

- 사진 업로드와 단원/오류유형 저장이 실제 화면에서 동작하는지 확인

단계:

1. 학생으로 `/student/dashboard` 진입
2. `사진 파일` 선택
3. `학기` 선택
4. `단원` 선택
5. `오류유형` 선택
6. 선택적으로 `학생 메모` 입력
7. `오답노트 저장` 클릭

기대 결과:

- `오답노트를 저장했습니다.` 메시지 표시
- 카드 목록에 새 오답이 생김
- KPI가 즉시 갱신됨
- 상세 드로어가 열림

### 시나리오 C. 학생 상세 수정 / 이미지 교체 / 삭제

목적:

- 학생이 자기 오답을 편집하고 제거할 수 있는지 확인

단계:

1. 방금 올린 오답 상세 드로어에서 메모 수정
2. 필요하면 다른 단원/오류유형으로 변경
3. 새 이미지 선택 후 `수정 저장`
4. 다시 상세를 열어 변경 반영 확인
5. 별도 테스트용 오답 1건을 만들어 `삭제` 실행

기대 결과:

- `오답 상세를 저장했습니다.` 표시
- 카드/상세 내용이 새 값으로 반영
- 삭제한 오답은 목록과 KPI에서 제외

### 시나리오 D. 보호자 대시보드 조회와 피드백 저장

목적:

- 보호자가 학생 오답 통계를 보고 피드백을 남길 수 있는지 확인

단계:

1. 보호자로 로그인
2. `/dashboard` 진입
3. 학생 선택
4. 카드 목록에서 오답 상세 열기
5. `보호자 피드백` 입력
6. `피드백 저장` 클릭

기대 결과:

- `보호자 피드백을 저장했습니다.` 표시
- 카드에 `피드백 있음` 상태 반영
- `피드백 완료` KPI 증가

### 시나리오 E. 학생이 피드백 재확인

목적:

- 보호자 피드백이 학생 화면에 다시 노출되는지 확인

단계:

1. 학생으로 다시 로그인
2. `/student/dashboard` 진입
3. 해당 오답 상세 열기

기대 결과:

- `보호자 피드백` 영역에 저장한 문구가 보임
- 최근 갱신일이 함께 보임

### 시나리오 F. 잘못된 이미지 업로드 실패

목적:

- 파일 시그니처 검증이 동작하는지 확인

단계:

1. 학생 업로드 폼 또는 상세 이미지 교체에서 `fake.png` 선택
2. 저장 실행

기대 결과:

- 업로드가 거부됨
- 기존 이미지는 유지됨

### 시나리오 G. 레거시 URL 리다이렉트 확인

목적:

- 더 이상 쓰지 않는 화면이 오답노트 홈으로 닫혀 있는지 확인

단계:

1. 보호자로 `/records/new`, `/study/content`, `/study/reviews` 직접 접근
2. 학생으로 `/student/study/session`, `/student/progress`, `/student/wrong-answers` 직접 접근

기대 결과:

- 보호자는 모두 `/dashboard`로 이동
- 학생은 모두 `/student/dashboard`로 이동
