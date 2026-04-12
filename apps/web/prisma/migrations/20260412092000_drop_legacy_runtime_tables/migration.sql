-- DropForeignKey
ALTER TABLE "public"."attempt_items" DROP CONSTRAINT "attempt_items_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."attempt_items" DROP CONSTRAINT "attempt_items_curriculum_node_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."attempt_items" DROP CONSTRAINT "attempt_items_practice_problem_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."attempts" DROP CONSTRAINT "attempts_material_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."attempts" DROP CONSTRAINT "attempts_practice_set_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."attempts" DROP CONSTRAINT "attempts_student_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."concept_lessons" DROP CONSTRAINT "concept_lessons_curriculum_node_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."mastery_snapshots" DROP CONSTRAINT "mastery_snapshots_curriculum_node_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."mastery_snapshots" DROP CONSTRAINT "mastery_snapshots_student_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."materials" DROP CONSTRAINT "materials_student_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."practice_problems" DROP CONSTRAINT "practice_problems_curriculum_node_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."practice_problems" DROP CONSTRAINT "practice_problems_practice_set_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."practice_sets" DROP CONSTRAINT "practice_sets_curriculum_node_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."student_unit_progress" DROP CONSTRAINT "student_unit_progress_curriculum_node_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."student_unit_progress" DROP CONSTRAINT "student_unit_progress_student_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."student_unit_progress" DROP CONSTRAINT "student_unit_progress_updated_by_guardian_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."study_reviews" DROP CONSTRAINT "study_reviews_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."study_reviews" DROP CONSTRAINT "study_reviews_guardian_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."study_reviews" DROP CONSTRAINT "study_reviews_student_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."study_work_artifacts" DROP CONSTRAINT "study_work_artifacts_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."wrong_answer_category_map" DROP CONSTRAINT "wrong_answer_category_map_category_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."wrong_answer_category_map" DROP CONSTRAINT "wrong_answer_category_map_wrong_answer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."wrong_answers" DROP CONSTRAINT "wrong_answers_attempt_item_id_fkey";

-- DropTable
DROP TABLE "public"."attempt_items";

-- DropTable
DROP TABLE "public"."attempts";

-- DropTable
DROP TABLE "public"."concept_lessons";

-- DropTable
DROP TABLE "public"."mastery_snapshots";

-- DropTable
DROP TABLE "public"."materials";

-- DropTable
DROP TABLE "public"."practice_problems";

-- DropTable
DROP TABLE "public"."practice_sets";

-- DropTable
DROP TABLE "public"."student_unit_progress";

-- DropTable
DROP TABLE "public"."study_reviews";

-- DropTable
DROP TABLE "public"."study_work_artifacts";

-- DropTable
DROP TABLE "public"."wrong_answer_categories";

-- DropTable
DROP TABLE "public"."wrong_answer_category_map";

-- DropTable
DROP TABLE "public"."wrong_answers";

-- DropEnum
DROP TYPE "public"."AttemptSourceType";

-- DropEnum
DROP TYPE "public"."MaterialSourceType";

-- DropEnum
DROP TYPE "public"."PracticeProblemType";

-- DropEnum
DROP TYPE "public"."StudyProgressStatus";
