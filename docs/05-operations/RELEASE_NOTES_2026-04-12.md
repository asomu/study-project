# Release Notes 2026-04-12

- Release Scope: recovery + cleanup + stabilization batch
- Baseline: WrongNote + Workbook private beta

## Summary

- 문서/구조 drift를 줄이기 위한 recovery 문서 세트를 추가했다.
- demo 운영 절차를 개선해 데모 학생 로그인 계정을 바로 준비할 수 있게 했다.
- stale response 회귀, storage known issue baseline, legacy Prisma cleanup까지 포함해 운영 기준을 더 명확히 했다.

## Included Changes

### Product / UX

- 보호영역 대시보드 셸과 관련 화면 개선 사항을 current baseline으로 반영했다.
- guardian/student wrong-note workspace의 stale response 회귀 시나리오를 추가했다.

### Demo / Operations

- `pnpm -C apps/web demo:activate-student` 명령을 추가했다.
- `DEMO_STUDENT_LOGIN_ID`, `DEMO_STUDENT_PASSWORD`, `DEMO_STUDENT_DISPLAY_NAME` 환경 변수로 데모 학생 로그인 계정을 제어할 수 있게 했다.
- `DEMO_RUNBOOK`, `USER_GUIDE`, `README` 계열 문서를 현재 운영 절차 기준으로 동기화했다.

### Documentation Recovery

- `PROJECT_RECOVERY_PLAN.md`, `DOC_SYNC_CHECKLIST.md`, `MODULE_CLASSIFICATION.md`를 추가했다.
- `PROJECT_STATUS`, `HANDOFF`, `CONTEXT_INDEX`, `DEVELOPMENT_PLAN`, `README` 계열 drift를 정리했다.

### CI / Verification

- `quality.yml`을 `pnpm verify:pr` 기준으로 정렬했다.
- CI용 Playwright browser 설치와 app data path/env를 정리했다.
- release gate 기준과 문서 기준의 차이를 줄였다.

### Storage / Known Issues

- empty leftover module directory를 제거했다.
- `KNOWN_STORAGE_ISSUES.json`를 도입해 legacy missing image 1건을 entry baseline으로 관리한다.
- `wrong-note-storage-audit.ts`가 `unexpectedMissingCount`를 출력하도록 확장했다.

### Database / Schema

- legacy ownership helper/type 의존을 제거했다.
- Prisma schema에서 dormant legacy models/enums를 제거했다.
- migration `20260412092000_drop_legacy_runtime_tables`를 추가하고 적용했다.
- `prisma/seed.ts` 에서 removed legacy schema 의존을 제거했다.

## Verification Snapshot

- `pnpm verify:pr` passed
- `bash scripts/check-doc-links.sh` passed
- focused stale-response Playwright regression passed
- storage audit baseline matched `KNOWN_STORAGE_ISSUES.json`

## Operational Notes

- current storage audit baseline has `missingCount=1`, but it is a known legacy entry with `unexpectedMissingCount=0`
- remaining operational attention is limited to:
  - heavy soak/mobile observation for `net::ERR_ABORTED`
  - storage baseline monitoring
  - demo helper operational fit
  - future 2027 curriculum refresh timing
