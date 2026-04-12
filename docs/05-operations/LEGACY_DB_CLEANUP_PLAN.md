# Legacy DB Cleanup Plan

- Last Updated: 2026-04-12
- Scope: dormant Prisma legacy tables and related code references
- Goal: 현재 WrongNote + Workbook baseline을 유지하면서 완료된 legacy DB drop 배치의 범위와 결과를 기록한다.

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

Removed legacy tables in the 2026-04-12 cleanup batch:

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

## 2. Executed Cleanup Summary

- ADR-0030 removed legacy runtime/API first and deferred schema drop to a later cleanup batch.
- The 2026-04-12 cleanup batch completed the remaining steps:
  - legacy ownership helper/type removal
  - Prisma schema cleanup
  - explicit drop migration application
  - Prisma client regeneration
  - `pnpm verify:pr` revalidation

## 3. Cleanup Notes

### `apps/web/src/modules/auth/ownership-guard.ts`

Legacy ownership helpers and Prisma payload types for the following were removed before schema drop:

- `Material`
- `Attempt`
- `AttemptItem`
- `WrongAnswer`

Active runtime now uses only:

- `assertStudentOwnership`
- `assertStudentLoginOwnership`

- `assertStudentOwnership`
- `assertStudentLoginOwnership`

## 4. Executed Order

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

## 5. Data Retention Outcome

- No in-app migration of legacy study/wrong-answer data into `WrongNote` was performed.
- Product source of truth remains `WrongNote + Workbook` only.
- Historical retention is handled through DB/migration history and storage backup records, not through current runtime compatibility.

## 6. Outcome

- No active code imports legacy Prisma payload types.
- `schema.prisma` contains only current runtime models.
- explicit migration `20260412092000_drop_legacy_runtime_tables` was applied.
- architecture/operations docs now describe the legacy DB cleanup as completed work.

## 7. Remaining Out of Scope

- redirect shim page removal
- storage known issue handling for legacy `/uploads/wrong-notes/...`
- stale request soak validation
- 2027 curriculum refresh work
