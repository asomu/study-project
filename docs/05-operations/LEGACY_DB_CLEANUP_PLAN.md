# Legacy DB Cleanup Plan

- Last Updated: 2026-04-12
- Scope: dormant Prisma legacy tables and related code references
- Goal: 현재 WrongNote + Workbook baseline을 유지하면서 legacy DB drop 배치를 안전하게 준비한다.

## 1. Current Baseline

Current runtime source of truth tables:

- `users`
- `user_credential_identifiers`
- `students`
- `student_invites`
- `curriculum_nodes`
- `wrong_notes`
- `workbook_templates`
- `workbook_template_stages`
- `student_workbooks`
- `student_workbook_progress`

Dormant legacy tables still present in Prisma schema:

- `materials`
- `attempts`
- `attempt_items`
- `wrong_answers`
- `wrong_answer_categories`
- `wrong_answer_category_map`
- `practice_sets`
- `practice_problems`
- `concept_lessons`
- `study_work_artifacts`
- `study_reviews`
- `student_unit_progress`
- `mastery_snapshots`

## 2. Why This Is Still Deferred

- ADR-0030 explicitly removed legacy runtime/API first and deferred schema drop to a later cleanup batch.
- Current product behavior no longer depends on those tables for wrong-note or workbook flows.
- However, Prisma schema and a few shared helper types still mention legacy models, so dropping the tables without code cleanup would break build/typecheck.

## 3. Code References That Must Be Removed First

### `apps/web/src/modules/auth/ownership-guard.ts`

Still contains legacy ownership helpers and Prisma payload types for:

- `Material`
- `Attempt`
- `AttemptItem`
- `WrongAnswer`

Current active runtime appears to use only:

- `assertStudentOwnership`
- `assertStudentLoginOwnership`

Implication:

- Before dropping legacy Prisma models/tables, remove legacy helper exports and their Prisma type references from `ownership-guard.ts`.

## 4. Recommended Execution Order

### Phase 1. Code Detach

1. Remove legacy helper types/functions from `ownership-guard.ts`.
2. Run `rg`/typecheck to confirm no active runtime imports legacy model helpers.
3. Keep redirect shim pages untouched.

### Phase 2. Prisma Schema Cleanup

1. Remove dormant legacy Prisma models from `schema.prisma`:
   - `Material`
   - `Attempt`
   - `AttemptItem`
   - `WrongAnswer`
   - `WrongAnswerCategory`
   - `WrongAnswerCategoryMap`
   - `PracticeSet`
   - `PracticeProblem`
   - `ConceptLesson`
   - `StudyWorkArtifact`
   - `StudyReview`
   - `StudentUnitProgress`
   - `MasterySnapshot`
2. Remove related enums only if no current model still references them:
   - `MaterialSourceType`
   - `AttemptSourceType`
   - `PracticeProblemType`
   - `StudyProgressStatus`
3. Regenerate Prisma client and fix any remaining type breakage.

### Phase 3. Database Migration

1. Create one explicit migration that drops dormant legacy tables only after schema cleanup is stable.
2. Prefer one focused drop batch instead of mixing with product feature work.
3. Record exact dropped tables in `DECISION_LOG.md` and `PROJECT_STATUS.md`.

## 5. Data Retention Recommendation

- Default recommendation: no in-app migration of legacy study/wrong-answer data into `WrongNote`.
- Reason: product source of truth has already changed, and documents explicitly say legacy data is not migrated into current wrong-note workspace.
- Before drop migration, take one final DB backup / schema snapshot for historical recovery only.

## 6. Success Criteria

- No active code imports legacy Prisma payload types.
- `schema.prisma` contains only current runtime models.
- `pnpm verify:pr` passes after Prisma regeneration and migration.
- Architecture/operations docs no longer describe dormant legacy tables as pending cleanup.

## 7. Out of Scope

- redirect shim page removal
- storage known issue handling for legacy `/uploads/wrong-notes/...`
- stale request soak validation
- 2027 curriculum refresh work
