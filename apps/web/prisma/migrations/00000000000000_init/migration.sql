-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('guardian', 'admin');

-- CreateEnum
CREATE TYPE "SchoolLevel" AS ENUM ('elementary', 'middle', 'high');

-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('math', 'science', 'english');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "guardian_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "school_level" "SchoolLevel" NOT NULL,
    "grade" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_nodes" (
    "id" TEXT NOT NULL,
    "curriculum_version" TEXT NOT NULL,
    "school_level" "SchoolLevel" NOT NULL,
    "subject" "Subject" NOT NULL,
    "grade" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "unit_code" TEXT NOT NULL,
    "unit_name" TEXT NOT NULL,
    "parent_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active_from" TIMESTAMP(3) NOT NULL,
    "active_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "subject" "Subject" NOT NULL,
    "school_level" "SchoolLevel" NOT NULL,
    "grade" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "attempt_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_items" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "curriculum_node_id" TEXT NOT NULL,
    "problem_no" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "difficulty" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wrong_answers" (
    "id" TEXT NOT NULL,
    "attempt_item_id" TEXT NOT NULL,
    "image_path" TEXT,
    "memo" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wrong_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wrong_answer_categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label_ko" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wrong_answer_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wrong_answer_category_map" (
    "wrong_answer_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "wrong_answer_category_map_pkey" PRIMARY KEY ("wrong_answer_id","category_id")
);

-- CreateTable
CREATE TABLE "mastery_snapshots" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "curriculum_node_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "accuracy" DECIMAL(4,3) NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastery_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "students_guardian_user_id_idx" ON "students"("guardian_user_id");

-- CreateIndex
CREATE INDEX "curriculum_nodes_school_level_subject_grade_semester_idx" ON "curriculum_nodes"("school_level", "subject", "grade", "semester");

-- CreateIndex
CREATE INDEX "curriculum_nodes_curriculum_version_school_level_subject_idx" ON "curriculum_nodes"("curriculum_version", "school_level", "subject");

-- CreateIndex
CREATE INDEX "materials_student_id_created_at_idx" ON "materials"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "attempts_student_id_attempt_date_idx" ON "attempts"("student_id", "attempt_date");

-- CreateIndex
CREATE INDEX "attempt_items_attempt_id_curriculum_node_id_idx" ON "attempt_items"("attempt_id", "curriculum_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "wrong_answers_attempt_item_id_key" ON "wrong_answers"("attempt_item_id");

-- CreateIndex
CREATE INDEX "wrong_answers_created_at_idx" ON "wrong_answers"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "wrong_answer_categories_key_key" ON "wrong_answer_categories"("key");

-- CreateIndex
CREATE INDEX "mastery_snapshots_student_id_curriculum_node_id_period_end_idx" ON "mastery_snapshots"("student_id", "curriculum_node_id", "period_end");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_guardian_user_id_fkey" FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_nodes" ADD CONSTRAINT "curriculum_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "curriculum_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_items" ADD CONSTRAINT "attempt_items_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_items" ADD CONSTRAINT "attempt_items_curriculum_node_id_fkey" FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_answers" ADD CONSTRAINT "wrong_answers_attempt_item_id_fkey" FOREIGN KEY ("attempt_item_id") REFERENCES "attempt_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_answer_category_map" ADD CONSTRAINT "wrong_answer_category_map_wrong_answer_id_fkey" FOREIGN KEY ("wrong_answer_id") REFERENCES "wrong_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_answer_category_map" ADD CONSTRAINT "wrong_answer_category_map_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "wrong_answer_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mastery_snapshots" ADD CONSTRAINT "mastery_snapshots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mastery_snapshots" ADD CONSTRAINT "mastery_snapshots_curriculum_node_id_fkey" FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

