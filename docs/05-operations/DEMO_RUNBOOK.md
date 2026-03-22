# Demo Runbook

- Last Updated: 2026-03-22
- Scope: `/Users/mark/Documents/project/study-project/apps/web`
- Audience: 제품 오너 / 운영자 / 내부 시연 담당자
- Goal: 현재 WrongNote + Workbook 제품 흐름을 같은 LAN에서 안정적으로 시연한다.

## 1. 다시 찾는 법

잊었을 때 우선 보는 문서:

- `/Users/mark/Documents/project/study-project/docs/CONTEXT_INDEX.md`
  - 지금 프로젝트가 어느 단계인지 2~3분 안에 파악할 때
- `/Users/mark/Documents/project/study-project/docs/INDEX.md`
  - 전체 문서 네비게이션이 필요할 때
- `/Users/mark/Documents/project/study-project/docs/05-operations/USER_GUIDE.md`
  - 보호자/학생 실제 사용 순서를 빠르게 다시 볼 때
- `/Users/mark/Documents/project/study-project/docs/04-quality/USER_E2E_MANUAL_CHECKLIST.md`
  - 기능이 하나씩 실제로 동작하는지 QA 순서대로 검증할 때
- `/Users/mark/Documents/project/study-project/docs/05-operations/OPERATIONS_CHECKLIST.md`
  - 운영 점검, 배포, 외부 공개 경계, 검증 명령을 확인할 때
- `/Users/mark/Documents/project/study-project/apps/web/README.md`
  - 서버 실행, 기본 계정, LAN 실행 명령을 다시 볼 때

## 2. 데모 준비 명령

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

4. Prisma 마이그레이션 + 기본 seed

```bash
pnpm -C apps/web prisma:generate
pnpm -C apps/web exec prisma migrate deploy
pnpm -C apps/web prisma:seed
```

5. LAN 데모용 빌드/서버 실행

```bash
pnpm -C apps/web build
pnpm -C apps/web start:lan
```

선택:

```bash
pnpm -C apps/web demo:seed
pnpm -C apps/web demo:clear
```

주의:

- 현재 `demo:seed`는 legacy `attempt / wrong-answer` 데모 데이터만 갱신한다.
- 현재 제품의 WrongNote + Workbook 시연 데이터는 아래 수동 준비 순서로 만든다.

## 3. 현재 데모 데이터 truth

- 기본 보호자 seed 계정은 존재한다.
  - email: `guardian@example.com`
  - password: `Guardian123!`
- 학생 로그인 계정은 기본으로 생성되지 않는다.
- 현재 제품 데모는 아래 수동 준비가 기준이다.
  1. 보호자가 학생 프로필 생성
  2. 초대코드 발급
  3. 학생 첫 활성화
  4. 보호자 workbook template 등록 + 학생 배정
  5. 학생이 progress와 wrong-note를 직접 입력
  6. 보호자가 feedback 저장

## 4. 시연 전 최소 준비 데이터

아래 상태까지 만들면 현재 제품의 핵심 화면을 대부분 시연할 수 있다.

1. 학생 1명 생성 + 학생 로그인 활성화 완료
2. workbook template 1개
3. student workbook 배정 1건
4. matrix 셀 상태 3개 이상
  - `시작전`
  - `진행중`
  - `완료`
5. wrong-note 2~3건
  - 최소 2개 단원
  - 최소 2개 오류유형
  - 1건은 workbook linkage 포함
6. guardian feedback 완료 wrong-note 1건

## 5. 권장 수동 준비 순서

### A. 보호자 초기 설정

1. `/login`으로 보호자 로그인
2. `/students/manage` 이동
3. 학생 프로필 생성
4. 초대코드 발급

### B. workbook template 등록과 배정

1. `/dashboard` 이동
2. 학생 선택
3. `문제집 템플릿 등록` 카드에서 템플릿 1개 생성
4. `학생 문제집 배정` 카드에서 해당 템플릿 배정

### C. 학생 첫 활성화

1. 보호자 로그아웃
2. `/student/activate` 이동
3. 초대코드, 학생 로그인 아이디, 비밀번호 입력
4. `/student/dashboard` 자동 진입 확인

### D. 학생 데이터 입력

1. `문제집 진도` 섹션에서 matrix 셀 2~3개 상태 변경
2. wrong-note 업로드 카드에서 이미지 업로드
3. 가능하면 workbook과 stage를 함께 연결
4. 서로 다른 단원/오류유형으로 1~2건 더 생성

### E. 보호자 피드백

1. 보호자로 다시 로그인
2. `/dashboard`에서 같은 학생 선택
3. wrong-note 상세 열기
4. `보호자 피드백` 저장

## 6. 권장 시연 시나리오

### A. 보호자 홈

주소:

- `http://127.0.0.1:3000/login` 또는 LAN 주소

확인 포인트:

- 학생 선택
- workbook KPI
- 단원별 완료 단계 수 bar chart
- `단원 x 단계` matrix
- wrong-note KPI
- `오답 현황 그래프`
- wrong-note 카드 목록

발표 포인트:

- 보호자는 학생별로 같은 데이터셋을 workbook progress와 wrong-note 두 축에서 동시에 본다.
- workbook matrix와 wrong-note 피드백이 한 화면 안에서 이어진다.

### B. 학생 홈

확인 포인트:

- `오답노트 홈`
- 이미지 업로드 + 오류유형 + 단원 + workbook linkage
- workbook progress 상태 변경
- 보호자 피드백 재확인

발표 포인트:

- 학생은 사진 기반으로 오답을 빠르게 누적한다.
- 틀린 문제를 workbook stage와 연결해 나중에 다시 찾을 수 있다.
- 보호자 피드백이 학생 상세에 다시 노출되어 복습 루프가 닫힌다.

### C. 실시간 반영 포인트

권장 순서:

1. 학생이 matrix 셀 1개 변경
2. 학생이 wrong-note 1건 저장
3. 보호자로 전환해 같은 학생 데이터 확인
4. 피드백 저장
5. 학생으로 돌아와 피드백 재확인

발표 포인트:

- 학생/보호자가 동일 workbook progress 데이터를 공유한다.
- wrong-note와 feedback 상태가 역할별 홈에서 같은 데이터로 반영된다.

## 7. 같은 LAN 접속 방법

이 범위에서만 허용:

- 같은 공유기 내부 네트워크
- 임시 데모 목적
- 공개 인터넷, 포트포워딩, 터널링, Live Server는 제외

### 7.1 Mac mini IP 확인

우선:

```bash
ipconfig getifaddr en0
```

값이 없으면:

```bash
ipconfig getifaddr en1
```

### 7.2 공유 주소

- 형식: `http://<LAN_IP>:3000/login`
- 예시: `http://192.168.0.15:3000/login`

### 7.3 주의사항

- 서버는 `pnpm -C apps/web start:lan`으로 실행한다.
- macOS 방화벽 팝업이 뜨면 Node.js incoming connection을 허용한다.
- 이 앱은 Next.js + API + DB 구조라 VS Code `Live Server`로는 데모하지 않는다.
- 절대 URL 관련 문제가 생길 때만 `APP_URL=http://<LAN_IP>:3000`로 맞춰 재실행한다.
- 보호자/학생 동시 시연은 브라우저 프로필 2개를 쓰는 편이 가장 안정적이다.

### 7.4 종료 방법

- 서버 터미널: `Ctrl+C`
- DB 종료:

```bash
docker compose -f infra/docker/docker-compose.local.yml down
```

## 8. 현재 한계와 메모

- `demo:seed`는 아직 current WrongNote + Workbook 데모 데이터를 만들지 않는다.
- guardian workbook template 수정 UX는 현재 prompt 기반이다.
- legacy image path에 실제 파일이 없으면 placeholder가 보일 수 있다.
- 현재 데모는 수동 준비 데이터가 가장 truthful하다.
