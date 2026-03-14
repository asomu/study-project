-- Extend user role enum for student accounts
ALTER TYPE "UserRole" ADD VALUE 'student';

-- Expand user account fields for shared login model
ALTER TABLE "users"
ADD COLUMN "login_id" TEXT,
ADD COLUMN "name" TEXT,
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "accepted_terms_at" TIMESTAMP(3),
ADD COLUMN "last_login_at" TIMESTAMP(3);

UPDATE "users"
SET
  "login_id" = "email",
  "name" = CASE
    WHEN split_part("email", '@', 1) <> '' THEN split_part("email", '@', 1)
    ELSE '사용자'
  END
WHERE "login_id" IS NULL OR "name" IS NULL;

ALTER TABLE "users"
ALTER COLUMN "login_id" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX "users_login_id_key" ON "users"("login_id");

-- Link optional student login users
ALTER TABLE "students"
ADD COLUMN "login_user_id" TEXT;

CREATE UNIQUE INDEX "students_login_user_id_key" ON "students"("login_user_id");

ALTER TABLE "students"
ADD CONSTRAINT "students_login_user_id_fkey"
FOREIGN KEY ("login_user_id") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- One-time invite records for student activation
CREATE TABLE "student_invites" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_by_guardian_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_invites_code_hash_key" ON "student_invites"("code_hash");
CREATE INDEX "student_invites_student_id_created_at_idx" ON "student_invites"("student_id", "created_at");
CREATE INDEX "student_invites_expires_at_used_at_idx" ON "student_invites"("expires_at", "used_at");

ALTER TABLE "student_invites"
ADD CONSTRAINT "student_invites_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "students"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "student_invites"
ADD CONSTRAINT "student_invites_created_by_guardian_user_id_fkey"
FOREIGN KEY ("created_by_guardian_user_id") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
