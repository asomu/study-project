-- CreateEnum
CREATE TYPE "MaterialSourceType" AS ENUM ('manual', 'system');

-- CreateEnum
CREATE TYPE "AttemptSourceType" AS ENUM ('manual', 'practice');

-- CreateEnum
CREATE TYPE "PracticeProblemType" AS ENUM ('single_choice', 'short_answer');

-- CreateEnum
CREATE TYPE "StudyProgressStatus" AS ENUM ('planned', 'in_progress', 'review_needed', 'completed');

-- AlterTable
ALTER TABLE "materials"
ADD COLUMN "source_type" "MaterialSourceType" NOT NULL DEFAULT 'manual',
ADD COLUMN "system_key" TEXT;

-- AlterTable
ALTER TABLE "attempts"
ADD COLUMN "source_type" "AttemptSourceType" NOT NULL DEFAULT 'manual',
ADD COLUMN "started_at" TIMESTAMP(3),
ADD COLUMN "submitted_at" TIMESTAMP(3),
ADD COLUMN "elapsed_seconds" INTEGER,
ADD COLUMN "practice_set_id" TEXT;

-- AlterTable
ALTER TABLE "attempt_items"
ADD COLUMN "practice_problem_id" TEXT,
ADD COLUMN "student_answer" TEXT;

-- CreateTable
CREATE TABLE "practice_sets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "school_level" "SchoolLevel" NOT NULL,
    "subject" "Subject" NOT NULL,
    "grade" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "curriculum_node_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_problems" (
    "id" TEXT NOT NULL,
    "practice_set_id" TEXT NOT NULL,
    "curriculum_node_id" TEXT NOT NULL,
    "problem_no" INTEGER NOT NULL,
    "type" "PracticeProblemType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "choices_json" JSONB,
    "correct_answer" TEXT NOT NULL,
    "explanation" TEXT,
    "skill_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_lessons" (
    "id" TEXT NOT NULL,
    "curriculum_node_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concept_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_work_artifacts" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "image_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_work_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_reviews" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "guardian_user_id" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "progress_status" "StudyProgressStatus" NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_unit_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "curriculum_node_id" TEXT NOT NULL,
    "status" "StudyProgressStatus" NOT NULL,
    "note" TEXT,
    "last_studied_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "updated_by_guardian_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_unit_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "materials_system_key_key" ON "materials"("system_key");

-- CreateIndex
CREATE INDEX "attempts_student_id_source_type_submitted_at_idx" ON "attempts"("student_id", "source_type", "submitted_at");

-- CreateIndex
CREATE INDEX "practice_sets_school_level_subject_grade_semester_is_active_idx" ON "practice_sets"("school_level", "subject", "grade", "semester", "is_active");

-- CreateIndex
CREATE INDEX "practice_sets_curriculum_node_id_sort_order_idx" ON "practice_sets"("curriculum_node_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "practice_problems_practice_set_id_problem_no_key" ON "practice_problems"("practice_set_id", "problem_no");

-- CreateIndex
CREATE INDEX "practice_problems_curriculum_node_id_difficulty_idx" ON "practice_problems"("curriculum_node_id", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "concept_lessons_curriculum_node_id_key" ON "concept_lessons"("curriculum_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_work_artifacts_attempt_id_key" ON "study_work_artifacts"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_reviews_attempt_id_key" ON "study_reviews"("attempt_id");

-- CreateIndex
CREATE INDEX "study_reviews_student_id_reviewed_at_idx" ON "study_reviews"("student_id", "reviewed_at");

-- CreateIndex
CREATE INDEX "study_reviews_guardian_user_id_reviewed_at_idx" ON "study_reviews"("guardian_user_id", "reviewed_at");

-- CreateIndex
CREATE UNIQUE INDEX "student_unit_progress_student_id_curriculum_node_id_key" ON "student_unit_progress"("student_id", "curriculum_node_id");

-- CreateIndex
CREATE INDEX "student_unit_progress_student_id_status_updated_at_idx" ON "student_unit_progress"("student_id", "status", "updated_at");

-- AddForeignKey
ALTER TABLE "attempts"
ADD CONSTRAINT "attempts_practice_set_id_fkey"
FOREIGN KEY ("practice_set_id") REFERENCES "practice_sets"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_items"
ADD CONSTRAINT "attempt_items_practice_problem_id_fkey"
FOREIGN KEY ("practice_problem_id") REFERENCES "practice_problems"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sets"
ADD CONSTRAINT "practice_sets_curriculum_node_id_fkey"
FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_problems"
ADD CONSTRAINT "practice_problems_practice_set_id_fkey"
FOREIGN KEY ("practice_set_id") REFERENCES "practice_sets"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_problems"
ADD CONSTRAINT "practice_problems_curriculum_node_id_fkey"
FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_lessons"
ADD CONSTRAINT "concept_lessons_curriculum_node_id_fkey"
FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_work_artifacts"
ADD CONSTRAINT "study_work_artifacts_attempt_id_fkey"
FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_reviews"
ADD CONSTRAINT "study_reviews_attempt_id_fkey"
FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_reviews"
ADD CONSTRAINT "study_reviews_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "students"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_reviews"
ADD CONSTRAINT "study_reviews_guardian_user_id_fkey"
FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_unit_progress"
ADD CONSTRAINT "student_unit_progress_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "students"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_unit_progress"
ADD CONSTRAINT "student_unit_progress_curriculum_node_id_fkey"
FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_unit_progress"
ADD CONSTRAINT "student_unit_progress_updated_by_guardian_user_id_fkey"
FOREIGN KEY ("updated_by_guardian_user_id") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
