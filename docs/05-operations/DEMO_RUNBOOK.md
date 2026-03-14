# Demo Runbook

- Last Updated: 2026-03-07
- Scope: `/Users/mark/Documents/project/study-project/apps/web`
- Audience: 제품 오너 / 운영자 / 내부 시연 담당자
- Goal: 데모용 샘플 데이터를 빠르게 채우고, 같은 LAN에서 다른 사람에게 현재 구현 상태를 안정적으로 보여준다.

## 1. 다시 찾는 법

잊었을 때 우선 보는 문서:

- `/Users/mark/Documents/project/study-project/docs/CONTEXT_INDEX.md`
  - 지금 프로젝트가 어느 단계인지 2~3분 안에 파악할 때
- `/Users/mark/Documents/project/study-project/docs/INDEX.md`
  - 전체 문서 네비게이션이 필요할 때
- `/Users/mark/Documents/project/study-project/apps/web/README.md`
  - 서버 실행, 기본 계정, 데모 스크립트, LAN 실행 명령이 필요할 때
- `/Users/mark/Documents/project/study-project/docs/04-quality/USER_E2E_MANUAL_CHECKLIST.md`
  - 기능이 하나씩 실제로 동작하는지 QA 순서대로 검증할 때
- `/Users/mark/Documents/project/study-project/docs/05-operations/OPERATIONS_CHECKLIST.md`
  - 운영 점검, 배포, 외부 공개 경계, 검증 명령을 확인할 때

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

5. 데모용 샘플 데이터 주입

```bash
pnpm -C apps/web demo:seed
```

선택:

```bash
DEMO_REFERENCE_DATE=2026-03-07 pnpm -C apps/web demo:seed
```

- 기본값은 실행일 `today`다.
- 데모 기준일을 고정하고 싶을 때만 `DEMO_REFERENCE_DATE`를 사용한다.

6. LAN 데모용 빌드/서버 실행

```bash
pnpm -C apps/web build
pnpm -C apps/web start:lan
```

정리할 때:

```bash
pnpm -C apps/web demo:clear
```

## 3. 샘플 데이터 설명

기본 대상:

- 보호자 계정: `guardian@example.com`
- 비밀번호: `Guardian123!`
- 학생: `기본 학생`

데모 데이터가 채우는 것:

- 최근 28일 안에 6회 시도
- 총 24개 문항
- 오답 12건
- 1학기 단원 5개
  - 소인수분해
  - 정수와 유리수
  - 문자와 식
  - 일차방정식
  - 좌표평면과 그래프

의도된 스토리:

- 초반에는 개념 실수와 독해 실수가 섞여 있다.
- 전체적으로는 완만히 회복했지만 `일차방정식`은 최근 7일에도 약점으로 남는다.
- 최근 오답 2건은 카테고리/이미지가 비어 있어서 시연 중 live 수정과 이미지 업로드를 보여줄 수 있다.
- 최근 7일 오답 카테고리는 완전히 비지 않도록 일부는 미리 분류되어 있다.

## 4. 시연 시나리오

### A. 로그인

- 주소: `http://127.0.0.1:3000/login` 또는 LAN 주소
- 계정: `guardian@example.com / Guardian123!`

발표 포인트:

- 보호자 계정이 학생 데이터를 관리하는 구조
- 로그인 후 바로 보호자 대시보드로 진입

### B. 대시보드 첫 화면

확인할 요소:

- 종합 점수
- 최근 4주 정확도
- 누적 오답 수
- 진도 대비 달성률
- 약점 단원 Top 5
- 오답 유형 분포
- 주간 성취 추이

발표 포인트:

- 시작 화면부터 빈 상태가 아니라 실제 사용 흔적이 보인다.
- `일차방정식`이 최근에도 약점으로 남아 있다는 점을 먼저 짚는다.

### C. 약점 기간 토글

단계:

1. `약점 기간`을 `최근 7일`에서 `최근 30일`로 변경
2. `대시보드 갱신` 클릭

발표 포인트:

- `weekly`는 지금 당장 보강이 필요한 문제를 본다.
- `monthly`는 누적 패턴을 본다.
- 최근 문제와 누적 패턴이 다를 수 있다는 점을 보여준다.

### D. 오답 관리

단계:

1. 상단 네비게이션에서 `오답 관리`
2. `to`를 오늘 기준으로 둔 상태에서 `오답 목록 조회`
3. 최근 오답 2건 중 하나를 선택
4. 비어 있는 카테고리 1개 저장
5. 준비한 실제 PNG/JPG/WebP 파일 1개 업로드

발표 포인트:

- wrong-answer 단위로 카테고리와 이미지가 후속 보강된다.
- 저장 직후 카드 상태가 바로 갱신된다.

### E. 기록 입력

단계:

1. 상단 네비게이션에서 `기록 입력`
2. 기존 학생 `기본 학생` 선택 유지
3. 문제집/시도 저장
4. `일차방정식` 또는 `문자와 식` 문항 1~2개 추가

권장 멘트:

- 오늘 학습을 바로 기록하면 대시보드에 즉시 반영된다.
- 입력과 분석이 분리되지 않고 하나의 흐름으로 이어진다.

### F. 대시보드 재확인

단계:

1. `대시보드`로 이동
2. `대시보드 갱신` 클릭

발표 포인트:

- 총 시도 수 / 총 문항 수 / 오답 수가 실제로 바뀐다.
- 최근 4주 지표와 약점 테이블이 live 데이터로 다시 계산된다.

### G. 로그아웃

발표 포인트:

- 보호 라우트는 로그인 세션이 있어야만 접근 가능하다.

## 5. 같은 LAN 접속 방법

이 범위에서만 허용:

- 같은 공유기 내부 네트워크
- 임시 데모 목적
- 공개 인터넷, 포트포워딩, 터널링, Live Server는 제외

### 5.1 Mac mini IP 확인

우선:

```bash
ipconfig getifaddr en0
```

값이 없으면:

```bash
ipconfig getifaddr en1
```

### 5.2 공유 주소

- 형식: `http://<LAN_IP>:3000/login`
- 예시: `http://192.168.0.15:3000/login`

### 5.3 주의사항

- 서버는 `pnpm -C apps/web start:lan`으로 실행한다.
- macOS 방화벽 팝업이 뜨면 Node.js incoming connection을 허용한다.
- 이 앱은 Next.js + API + DB 구조라 VS Code `Live Server`로는 데모하지 않는다.
- 절대 URL 관련 문제가 생길 때만 `APP_URL=http://<LAN_IP>:3000`로 맞춰 재실행한다.

### 5.4 종료 방법

- 서버 터미널: `Ctrl+C`
- DB 종료:

```bash
docker compose -f infra/docker/docker-compose.local.yml down
```
