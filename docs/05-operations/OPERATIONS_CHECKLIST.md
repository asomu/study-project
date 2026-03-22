# Operations Checklist

- Last Updated: 2026-03-22
- Scope: Private beta 로컬 운영(`apps/web`)
- Owner: Team

## 1. Wrong-note Storage Audit Routine

- Command:
  - `pnpm -C apps/web run wrong-note:storage:audit -- --json`
- Cadence:
  - 매일 백업 이후 1회 확인
  - 수동 배포 / `verify:release` 전 1회 확인
- Pass Criteria:
  - `missingCount = 0`
  - `orphanCount = 0`
- Response Rule:
  - `missing.kind = legacy`만 존재하면, 기존 legacy 공개 경로 유실 baseline과 비교해 count 증감만 추적한다.
  - `missing.kind = storage | invalid`가 1건이라도 있으면 같은 날 P1로 조사한다.
  - `orphanCount > 0`이면 DB 참조 여부를 재확인하고 24시간 안에 정리 계획을 남긴다.
- Current Baseline (2026-03-22):
  - `wrongNoteCount = 1`
  - `missingCount = 1`
  - `orphanCount = 0`
  - missing entry는 legacy `/uploads/wrong-notes/...` 경로 1건이며 자동 복구 대상이 아니다.

## 2. Upload Storage Backup Policy

- Source Directory:
  - `/Users/mark/Library/Application Support/study-project/wrong-notes`
- Backup Root:
  - `/Users/mark/Library/Application Support/study-project-backups`
- Schedule:
  - 매일 02:00 (Asia/Seoul, KST) 백업 수행
- Retention:
  - 일간 백업: 14일 보관
  - 주간 스냅샷: 8주 보관
  - 월간 스냅샷: 6개월 보관
- Manual Verification:
  - 2026-03-22 `pnpm -C apps/web run wrong-note:storage:backup` 실행으로 archive 생성 확인
  - latest verified archive root: `/Users/mark/Library/Application Support/study-project-backups`
  - 2026-03-22 restore smoke: `study-project-20260322-205441.tar.gz`를 `/Users/mark/Documents/project/study-project/output/restore-smoke/20260322-restore-check`에 정상 압축 해제 확인
  - restored structure baseline: `study-project/wrong-notes` 디렉터리까지 존재, 현재 archive payload는 0B

## 3. Cleanup Policy

- 만료된 일간/주간/월간 백업은 백업 작업 직후 정리한다.
- 삭제 전 최신 백업 1개는 항상 유지한다.
- 수동 정리 시에도 보관 정책(일 14/주 8/월 6)을 초과하지 않도록 동일 기준을 적용한다.

## 4. Alert and Monitoring Thresholds

- 업로드 디렉터리 용량이 2GB를 초과하면 점검한다.
- 백업 실패가 2회 연속 발생하면 우선순위 P1 이슈로 처리한다.
- 이미지 업로드 실패가 하루 3회 이상 발생하면 업로드 경로/권한/디스크 여유 공간을 점검한다.
- storage audit에서 `missing.kind = storage | invalid`가 1건이라도 나오면 운영 장애 후보로 본다.
- storage audit의 legacy missing count가 baseline보다 증가하면 migration/cleanup 회귀로 보고 원인을 추적한다.

## 5. External Exposure Preflight Checklist

- TLS:
  - reverse proxy(Caddy) TLS 인증서 적용 여부 확인
- Access Control:
  - 외부 접근 허용 시 IP 제한 또는 인증 게이트 적용 여부 확인
- Auth and Ownership:
  - JWT + HttpOnly 쿠키 정책 유지 여부 확인
  - 보호자-학생 소유권 체인 검증 API 회귀 테스트 통과 확인
- Logging:
  - 인증 실패/권한 거부/업로드 실패 로그가 누락 없이 남는지 확인

## 6. Operational Verification Commands

- `pnpm verify:pr`
- `pnpm verify:release`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm -C apps/web run wrong-note:storage:audit -- --json`
- `pnpm -C apps/web run wrong-note:storage:backup`
- `bash scripts/check-doc-links.sh`

## 7. Internal LAN Demo Boundary

- 내부 LAN 데모는 `pnpm -C apps/web build` 후 `pnpm -C apps/web start:lan`으로만 연다.
- 내부 공유 주소는 `http://<LAN_IP>:3000/login` 형식으로 안내한다.
- VS Code `Live Server` 같은 정적 서버 방식은 이 앱의 공식 데모 방법이 아니다.
- 외부 공개는 여전히 reverse proxy/TLS/접근제어 preflight 이후에만 허용한다.
- 상세 시연 절차는 `/Users/mark/Documents/project/study-project/docs/05-operations/DEMO_RUNBOOK.md`를 기준으로 한다.

## 8. Manual Deploy Procedure (Mac mini)

사전 조건:

- GitHub Actions `quality.yml` green
- 필요 시 `release-gate.yml` 수동 실행 및 artifact 확인
- 로컬 운영 DB/업로드 백업 상태 확인

실행 순서:

1. `pnpm install --frozen-lockfile`
2. `mkdir -p "/Users/mark/Library/Application Support/study-project/wrong-notes" "/Users/mark/Library/Application Support/study-project-backups"`
3. `pnpm -C apps/web exec prisma migrate deploy`
4. `pnpm -C apps/web prisma:seed`
5. `pnpm build`
6. `pnpm -C apps/web run wrong-note:storage:audit -- --json`
7. 앱 프로세스 재시작
8. `pnpm verify:release`

판정:

- `verify:release` 전부 통과 시에만 배포 완료로 본다.
- storage audit에서 `storage`/`invalid` missing이 발견되면 배포를 멈추고 원인 분석으로 전환한다.
- 업로드 디렉터리 용량 HOLD 또는 real smoke 실패 시 즉시 롤백/원인 분석으로 전환한다.

## 9. Private Beta Start Checklist

- 보호자 가입(`/signup`)이 정상 동작하는지 수동 확인한다.
- 학생 프로필 생성 -> 초대코드 발급 -> 학생 활성화(`/student/activate`) 흐름을 1회 통과시킨다.
- 보호자 대시보드(`/dashboard`)와 학생 대시보드(`/student/dashboard`)가 각 역할에서만 열리는지 확인한다.
- 보호자가 문제집 템플릿을 1건 등록하고 학생에게 배정되는지 확인한다.
- 학생/보호자가 같은 문제집 진도 matrix를 보고 상태를 바꿀 수 있는지 확인한다.
- 학생 오답 업로드 시 문제집과 단계를 연결하고 상세에서 다시 보이는지 확인한다.
- 비공개 베타 운영에서는 내부 LAN 또는 제한된 접근만 허용한다.
