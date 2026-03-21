-- CreateEnum
CREATE TYPE "WrongNoteReason" AS ENUM ('calculation_mistake', 'misread_question', 'lack_of_concept');

-- CreateTable
CREATE TABLE "wrong_notes" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "curriculum_node_id" TEXT NOT NULL,
    "reason" "WrongNoteReason" NOT NULL,
    "image_path" TEXT NOT NULL,
    "student_memo" TEXT,
    "guardian_feedback" TEXT,
    "guardian_feedback_by_user_id" TEXT,
    "guardian_feedback_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wrong_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wrong_notes_student_id_created_at_idx" ON "wrong_notes"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "wrong_notes_student_id_reason_created_at_idx" ON "wrong_notes"("student_id", "reason", "created_at");

-- CreateIndex
CREATE INDEX "wrong_notes_curriculum_node_id_created_at_idx" ON "wrong_notes"("curriculum_node_id", "created_at");

-- CreateIndex
CREATE INDEX "wrong_notes_student_id_guardian_feedback_at_idx" ON "wrong_notes"("student_id", "guardian_feedback_at");

-- CreateIndex
CREATE INDEX "wrong_notes_deleted_at_idx" ON "wrong_notes"("deleted_at");

-- AddForeignKey
ALTER TABLE "wrong_notes" ADD CONSTRAINT "wrong_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_notes" ADD CONSTRAINT "wrong_notes_curriculum_node_id_fkey" FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wrong_notes" ADD CONSTRAINT "wrong_notes_guardian_feedback_by_user_id_fkey" FOREIGN KEY ("guardian_feedback_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
