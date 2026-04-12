# Project Recovery Plan

- Last Updated: 2026-04-12
- Scope: current runtime audit + documentation recovery + cleanup prioritization
- Goal: 관리 공백 이후에도 현재 제품 상태를 다시 신뢰 가능하게 만들기 위한 실행 기준을 고정한다.

## 1. Current Assessment

- Current runtime baseline is `WrongNote + Workbook` centered private beta.
- Core app/test/doc structure still exists and is usable.
- Main problem is not total project collapse, but drift between active code, status docs, handoff docs, and verification expectations.

## 2. Recovery Objectives

1. Re-establish a single source of truth for current product status.
2. Reduce document drift between product, operations, quality, and README surfaces.
3. Classify active runtime vs shared legacy naming vs removable leftovers.
4. Align CI/runtime verification with the documented gate policy.

## 3. Execution Order

### Phase 1. Truth Reset

1. Treat `docs/05-operations/PROJECT_STATUS.md` as the primary current-state document.
2. Sync `docs/CONTEXT_INDEX.md`, `docs/05-operations/HANDOFF.md`, and `docs/03-process/DEVELOPMENT_PLAN.md` to that baseline.
3. Record any mismatch as either:
   - doc stale
   - runtime stale
   - intentionally deferred

### Phase 2. Documentation Recovery

1. Fix high-visibility inconsistencies first:
   - root `README.md`
   - `apps/web/README.md`
   - `docs/05-operations/USER_GUIDE.md`
2. Keep product definition in `PRD`, current implementation state in `PROJECT_STATUS`, and latest session trail in `HANDOFF`.
3. Add and maintain a document sync checklist for future sessions.

### Phase 3. Runtime Classification

1. Keep active modules clearly listed.
2. Mark shared utilities that still use legacy names but are part of current runtime.
3. Mark empty/remnant directories as cleanup candidates instead of pretending they are already gone.

### Phase 4. Verification Alignment

1. Compare documented gates with GitHub Actions and local scripts.
2. Make `quality.yml` and `verify:pr` use the same practical policy.
3. Re-run representative gates after cleanup changes.

## 4. Immediate Priorities

1. Bring session bootstrap docs up to date.
2. Eliminate obvious wording drift in user-facing documentation.
3. Publish an explicit module classification table.
4. Review CI workflow mismatch against `pnpm verify:pr`.

## 5. Deferred but Known Work

1. Prisma legacy table drop migration scope and retention policy
2. stale request abort soak follow-up
3. legacy missing image baseline handling
4. optional demo student activation smoothing

## 6. Definition of Recovery Done

- Session bootstrap docs point to the same current state.
- README/docs wording matches the actual supported audience and current UX.
- Active vs leftover modules are explicitly classified.
- CI/documented verification policy no longer diverges silently.
