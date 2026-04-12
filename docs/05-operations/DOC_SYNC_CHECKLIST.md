# Document Sync Checklist

- Last Updated: 2026-04-12
- Purpose: 현재 제품 상태를 문서 간에 일관되게 유지하기 위한 운영 체크리스트

## 1. Single Source of Truth

- Current implementation/status truth: `docs/05-operations/PROJECT_STATUS.md`
- Session bootstrap summary: `docs/CONTEXT_INDEX.md`
- Latest session trail: `docs/05-operations/HANDOFF.md`
- Product scope/source of requirements: `docs/01-product/PRD.md`

## 2. Update Triggers

### Product Scope Changes

- Update `docs/01-product/PRD.md`
- If user-visible flow changed, update `docs/05-operations/USER_GUIDE.md`
- If onboarding/setup wording changed, update `README.md` and `apps/web/README.md`

### Architecture or Runtime Boundary Changes

- Update `docs/02-architecture/SYSTEM_ARCHITECTURE.md`
- Update `docs/02-architecture/PROJECT_STRUCTURE.md`
- Update `docs/02-architecture/MODULE_CLASSIFICATION.md`
- Update `docs/05-operations/DECISION_LOG.md` when the change is a real architectural decision

### Testing or Gate Changes

- Update `docs/04-quality/TEST_AND_VALIDATION.md`
- Update `.github/workflows/quality.yml` and/or `.github/workflows/release-gate.yml`
- Update `scripts/run-verification-gates.sh` if execution policy changed

### Session Closeout

- Update `docs/05-operations/PROJECT_STATUS.md`
- Update `docs/05-operations/HANDOFF.md`
- Update `docs/CONTEXT_INDEX.md`

## 3. High-Risk Drift Checks

- Does README still describe the same target user and product scope as PRD?
- Does USER_GUIDE describe the actual current UI behavior?
- Do bootstrap docs have a newer or equal date than the latest meaningful product status change?
- Does CI execute the same gate policy that docs describe?
- Are legacy/runtime boundaries described the same way in status, architecture, and code structure docs?

## 4. Current Known Drift Items (2026-04-12 Baseline)

- `README.md` and `apps/web/README.md` had middle-school-only wording while PRD/status had elementary + middle scope.
- `USER_GUIDE.md` contained stale `prompt` wording for workbook template editing.
- `PROJECT_STATUS.md` was newer than `CONTEXT_INDEX.md`, `HANDOFF.md`, and `DEVELOPMENT_PLAN.md`.
- `quality.yml` did not mirror the documented `verify:pr` path-based E2E policy.
- Empty legacy-named module directories remained under `apps/web/src/modules`.

## 5. Recommended End-of-Session Command

```bash
bash scripts/check-doc-links.sh
```
