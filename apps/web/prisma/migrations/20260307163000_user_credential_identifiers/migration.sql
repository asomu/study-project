DO $$
BEGIN
  IF EXISTS (
    WITH normalized_identifiers AS (
      SELECT lower("login_id") AS value, "id"
      FROM "users"
      WHERE "login_id" IS NOT NULL

      UNION ALL

      SELECT lower("email") AS value, "id"
      FROM "users"
      WHERE "email" IS NOT NULL
    )
    SELECT 1
    FROM normalized_identifiers
    GROUP BY value
    HAVING count(DISTINCT "id") > 1
  ) THEN
    RAISE EXCEPTION 'Cross-field identifier collision exists in users. Resolve duplicates before applying migration.';
  END IF;
END $$;

CREATE TABLE "user_credential_identifiers" (
    "value" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_credential_identifiers_pkey" PRIMARY KEY ("value")
);

CREATE INDEX "user_credential_identifiers_user_id_idx" ON "user_credential_identifiers"("user_id");

ALTER TABLE "user_credential_identifiers"
ADD CONSTRAINT "user_credential_identifiers_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

INSERT INTO "user_credential_identifiers" ("value", "user_id")
SELECT DISTINCT lower("identifier_value"), "user_id"
FROM (
  SELECT "login_id" AS "identifier_value", "id" AS "user_id"
  FROM "users"
  WHERE "login_id" IS NOT NULL

  UNION ALL

  SELECT "email" AS "identifier_value", "id" AS "user_id"
  FROM "users"
  WHERE "email" IS NOT NULL
) AS normalized_identifiers
WHERE "identifier_value" IS NOT NULL;
