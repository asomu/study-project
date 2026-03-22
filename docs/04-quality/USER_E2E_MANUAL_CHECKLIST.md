# User E2E Manual Checklist

- Last Updated: 2026-03-22
- Scope: `/Users/mark/Documents/project/study-project/apps/web`
- Audience: 제품 오너 / 운영자 / 수동 QA
- Goal: 보호자 온보딩, workbook setup, 학생 진도/오답 입력, 보호자 피드백, 학생 재확인까지 현재 WrongNote + Workbook 핵심 루프를 수동 검증한다.

## 1. 사용 전제

- 현재 기본 제품 경험은 학생 `/student/dashboard`, 보호자 `/dashboard`다.
- 보호자 첫 설정 화면은 `/students/manage`다.
- seed 보호자 계정은 제공되지만 학생 로그인 계정은 기본으로 생성되지 않는다.
- `demo:seed`는 현재 legacy assessment demo data만 채우므로, WrongNote/Workbook 수동 검증 데이터는 아래 시나리오로 직접 만든다.
- 레거시 `records/new`, `student/study/session`, `student/progress`, `study/reviews`, `study/content`, `wrong-answers/manage`는 현재 제품 기준 비활성 또는 리다이렉트 대상이다.

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
pnpm -C apps/web db:reset
```

5. 개발 서버 실행

```bash
pnpm -C apps/web dev
```

6. 브라우저에서 열기

- [login](http://127.0.0.1:3000/login)

## 3. 테스트 계정과 기본 데이터

- 보호자 seed 계정
  - email: `guardian@example.com`
  - password: `Guardian123!`
- 학생 로그인 계정
  - `/students/manage`에서 학생 프로필 생성 + 초대코드 발급 후 `/student/activate`에서 최초 활성화 필요
- 기본 커리큘럼
  - 중1~중3 / 1~2학기 샘플 단원
- 권장 검증용 데이터 목표
  - 학생 1명
  - 문제집 템플릿 1개
  - 학생 배정 1건
  - 상태가 다른 workbook progress 셀 3개 이상
  - 서로 다른 단원/오류유형 WrongNote 2건 이상

## 4. 업로드 테스트용 파일 준비

정상 업로드용:

- 실제 `.png`, `.jpg`, `.webp`, `.heic`, `.heif` 이미지 1개 이상

실패 업로드용:

```bash
mkdir -p ~/Desktop/study-manual-test
printf 'not-a-real-png' > ~/Desktop/study-manual-test/fake.png
```

## 5. 권장 실행 순서

1. 시나리오 A: 보호자 로그인과 학생 온보딩
2. 시나리오 B: 보호자 문제집 템플릿 등록
3. 시나리오 C: 보호자 학생 문제집 배정
4. 시나리오 D: 학생 활성화와 홈 진입
5. 시나리오 E: 학생 workbook progress 수정
6. 시나리오 F: 학생 wrong-note 업로드와 workbook linkage
7. 시나리오 G: 학생 상세 수정 / 이미지 교체 / 삭제
8. 시나리오 H: 보호자 대시보드 조회와 피드백 저장
9. 시나리오 I: 학생이 피드백 재확인
10. 시나리오 J: 잘못된 이미지 업로드 실패
11. 시나리오 K: 레거시 URL 리다이렉트 확인

## 6. 상세 시나리오

### 시나리오 A. 보호자 로그인과 학생 온보딩

목적:

- 보호자가 첫 학생을 만들고 초대코드를 발급할 수 있는지 확인

단계:

1. `/login` 진입
2. 보호자 계정으로 로그인
3. `/students/manage` 이동
4. `학생 이름`, `학교급`, `학년` 입력 후 `학생 프로필 생성`
5. 생성된 학생 카드에서 `초대코드 발급`
6. 표시된 초대코드를 기록

기대 결과:

- 학생 생성 후 `학생 프로필을 만들었습니다. 이제 초대코드를 발급할 수 있습니다.` 메시지 표시
- 학생 카드에 초대코드와 만료시각이 표시
- 학생이 아직 미연결 상태로 보임

### 시나리오 B. 보호자 문제집 템플릿 등록

목적:

- 현재 대시보드에서 보호자가 workbook template을 직접 등록할 수 있는지 확인

단계:

1. `/dashboard` 이동
2. 방금 만든 학생 선택
3. `문제집 진도` 섹션의 `문제집 템플릿 등록` 카드에서 아래 입력
  - 문제집 이름
  - 출판사
  - 학교급
  - 대상 학년
  - 학기
  - 단계 3~4개
4. `템플릿 저장` 클릭

기대 결과:

- `문제집 템플릿을 등록했습니다.` 메시지 표시
- 템플릿이 배정 카드 또는 선택 목록에서 보임

### 시나리오 C. 보호자 학생 문제집 배정

목적:

- 보호자가 학생에게 workbook을 배정하고 보관/복구 가능한지 확인

단계:

1. 같은 화면의 `학생 문제집 배정` 카드에서 방금 만든 템플릿 선택
2. `학생에게 배정` 클릭
3. 배정된 카드가 보이면 `배정 보관` 클릭
4. 같은 카드에서 `배정 복구` 클릭

기대 결과:

- `학생에게 문제집을 배정했습니다.` 메시지 표시
- 보관/복구 메시지가 각각 정상 표시
- workbook selector에 해당 배정이 유지됨

### 시나리오 D. 학생 활성화와 홈 진입

목적:

- 학생이 초대코드로 첫 로그인 계정을 만들고 자기 홈에 들어가는지 확인

단계:

1. 로그아웃
2. `/student/activate` 진입
3. 시나리오 A의 초대코드 입력
4. 학생 로그인 아이디, 비밀번호, 표시 이름 입력 후 활성화 완료
5. 자동 이동된 `/student/dashboard` 확인

기대 결과:

- 학생이 `오답노트 홈`으로 진입
- 학생 홈에서 `문제집 진도`, `오답 현황 그래프`, wrong-note 업로드 섹션이 보임

### 시나리오 E. 학생 workbook progress 수정

목적:

- 학생이 자기 workbook의 matrix 상태를 바꾸면 KPI와 bar chart가 반영되는지 확인

단계:

1. 학생 홈에서 `문제집 진도` 섹션 확인
2. 대상 학년과 문제집 선택
3. matrix 셀 2~3개를 눌러 `시작전 -> 진행중 -> 완료` 순서로 변경
4. 같은 셀을 한 번 더 눌러 순환 동작 확인

기대 결과:

- 셀 라벨이 `시작전`, `진행중`, `완료`로 순환
- `전체 단계 수`, `완료`, `진행중`, `시작전`, `완료율` KPI가 변함
- 단원별 완료 단계 수 bar chart가 반영됨

### 시나리오 F. 학생 wrong-note 업로드와 workbook linkage

목적:

- 사진 업로드, 오류유형 저장, workbook linkage가 실제 화면에서 동작하는지 확인

단계:

1. 학생 홈의 업로드 영역에서 이미지 파일 선택
2. `문제집 선택`에 방금 배정된 workbook 선택
3. `문제집 단계` 선택
4. `단원` 선택
5. `오류유형` 선택
6. 선택적으로 `학생 메모` 입력
7. `오답노트 저장` 클릭

기대 결과:

- `오답노트를 저장했습니다.` 메시지 표시
- 카드 목록에 새 wrong-note가 추가
- KPI가 즉시 갱신
- 카드 또는 상세에서 `문제집명 + 출판사 + 단계명`이 보임
- workbook을 선택한 경우 grade/semester는 workbook 기준으로 고정 동작

### 시나리오 G. 학생 상세 수정 / 이미지 교체 / 삭제

목적:

- 학생이 자기 wrong-note를 편집하고 제거할 수 있는지 확인

단계:

1. 방금 올린 wrong-note 상세에서 메모 수정
2. 필요하면 다른 단원/오류유형으로 변경
3. 새 이미지 선택 후 `수정 저장`
4. 다시 상세를 열어 변경 반영 확인
5. 별도 테스트용 wrong-note 1건을 만들어 `삭제` 실행

기대 결과:

- `오답 상세를 저장했습니다.` 메시지 표시
- 카드/상세 내용이 새 값으로 반영
- 삭제한 wrong-note는 목록과 KPI에서 제외

### 시나리오 H. 보호자 대시보드 조회와 피드백 저장

목적:

- 보호자가 학생 wrong-note 통계와 workbook 현황을 보고 피드백을 남길 수 있는지 확인

단계:

1. 보호자로 다시 로그인
2. `/dashboard` 진입
3. 해당 학생 선택
4. workbook KPI와 matrix가 학생에서 변경한 상태와 같은지 확인
5. wrong-note 카드에서 상세 열기
6. `보호자 피드백` 입력
7. `피드백 저장` 클릭

기대 결과:

- `보호자 피드백을 저장했습니다.` 메시지 표시
- 카드에 `피드백 있음` 상태 반영
- `피드백 완료` KPI 증가

### 시나리오 I. 학생이 피드백 재확인

목적:

- 보호자 피드백이 학생 화면에 다시 노출되는지 확인

단계:

1. 학생으로 다시 로그인
2. `/student/dashboard` 진입
3. 해당 wrong-note 상세 열기

기대 결과:

- `보호자 피드백` 영역에 저장한 문구가 보임
- 최근 갱신일이 함께 보임

### 시나리오 J. 잘못된 이미지 업로드 실패

목적:

- 파일 시그니처 검증이 동작하는지 확인

단계:

1. 학생 업로드 폼 또는 상세 이미지 교체에서 `fake.png` 선택
2. 저장 실행

기대 결과:

- 업로드가 거부됨
- 기존 이미지는 유지됨

### 시나리오 K. 레거시 URL 리다이렉트 확인

목적:

- 더 이상 쓰지 않는 화면이 wrong-note 홈으로 닫혀 있는지 확인

단계:

1. 보호자로 `/records/new`, `/study/content`, `/study/reviews`, `/wrong-answers/manage` 직접 접근
2. 학생으로 `/student/study/session`, `/student/progress`, `/student/wrong-answers` 직접 접근

기대 결과:

- 보호자는 모두 `/dashboard`로 이동
- 학생은 모두 `/student/dashboard`로 이동
