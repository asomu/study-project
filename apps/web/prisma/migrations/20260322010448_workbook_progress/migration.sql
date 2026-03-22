-- CreateEnum
CREATE TYPE "WorkbookProgressStatus" AS ENUM ('not_started', 'in_progress', 'completed');

-- AlterTable
ALTER TABLE "wrong_notes" ADD COLUMN     "student_workbook_id" TEXT,
ADD COLUMN     "workbook_template_stage_id" TEXT;

-- CreateTable
CREATE TABLE "workbook_templates" (
    "id" TEXT NOT NULL,
    "guardian_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "school_level" "SchoolLevel" NOT NULL,
    "grade" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workbook_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workbook_template_stages" (
    "id" TEXT NOT NULL,
    "workbook_template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workbook_template_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_workbooks" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "workbook_template_id" TEXT NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_workbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_workbook_progress" (
    "id" TEXT NOT NULL,
    "student_workbook_id" TEXT NOT NULL,
    "curriculum_node_id" TEXT NOT NULL,
    "workbook_template_stage_id" TEXT NOT NULL,
    "status" "WorkbookProgressStatus" NOT NULL,
    "updated_by_user_id" TEXT NOT NULL,
    "last_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_workbook_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workbook_templates_guardian_user_id_grade_semester_is_activ_idx" ON "workbook_templates"("guardian_user_id", "grade", "semester", "is_active");

-- CreateIndex
CREATE INDEX "workbook_template_stages_workbook_template_id_sort_order_idx" ON "workbook_template_stages"("workbook_template_id", "sort_order");

-- CreateIndex
CREATE INDEX "student_workbooks_student_id_is_archived_created_at_idx" ON "student_workbooks"("student_id", "is_archived", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "student_workbooks_student_id_workbook_template_id_key" ON "student_workbooks"("student_id", "workbook_template_id");

-- CreateIndex
CREATE INDEX "student_workbook_progress_student_workbook_id_status_last_u_idx" ON "student_workbook_progress"("student_workbook_id", "status", "last_updated_at");

-- CreateIndex
CREATE INDEX "student_workbook_progress_curriculum_node_id_last_updated_a_idx" ON "student_workbook_progress"("curriculum_node_id", "last_updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "student_workbook_progress_student_workbook_id_curriculum_no_key" ON "student_workbook_progress"("student_workbook_id", "curriculum_node_id", "workbook_template_stage_id");

-- CreateIndex
CREATE INDEX "wrong_notes_student_workbook_id_created_at_idx" ON "wrong_notes"("student_workbook_id", "created_at");

-- AddForeignKey
ALTER TABLE "wrong_notes" ADD CONSTRAINT "wrong_notes_student_workbook_id_fkey" FOREIGN KEY ("student_workbook_id") REFERENCES "student_workbooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_notes" ADD CONSTRAINT "wrong_notes_workbook_template_stage_id_fkey" FOREIGN KEY ("workbook_template_stage_id") REFERENCES "workbook_template_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workbook_templates" ADD CONSTRAINT "workbook_templates_guardian_user_id_fkey" FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workbook_template_stages" ADD CONSTRAINT "workbook_template_stages_workbook_template_id_fkey" FOREIGN KEY ("workbook_template_id") REFERENCES "workbook_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_workbooks" ADD CONSTRAINT "student_workbooks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_workbooks" ADD CONSTRAINT "student_workbooks_workbook_template_id_fkey" FOREIGN KEY ("workbook_template_id") REFERENCES "workbook_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_workbook_progress" ADD CONSTRAINT "student_workbook_progress_student_workbook_id_fkey" FOREIGN KEY ("student_workbook_id") REFERENCES "student_workbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_workbook_progress" ADD CONSTRAINT "student_workbook_progress_curriculum_node_id_fkey" FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_workbook_progress" ADD CONSTRAINT "student_workbook_progress_workbook_template_stage_id_fkey" FOREIGN KEY ("workbook_template_stage_id") REFERENCES "workbook_template_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_workbook_progress" ADD CONSTRAINT "student_workbook_progress_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
