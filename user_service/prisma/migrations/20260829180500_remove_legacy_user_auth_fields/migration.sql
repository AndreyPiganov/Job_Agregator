-- Move contacts created before the UserContact model was introduced.
-- Existing values in user_contacts take precedence over legacy values.
INSERT INTO "user"."user_contacts" AS contacts (
    "user_id",
    "email",
    "phone_number",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    "email",
    "phone_number",
    "created_at",
    "updated_at"
FROM "user"."users"
WHERE "email" IS NOT NULL OR "phone_number" IS NOT NULL
ON CONFLICT ("user_id") DO UPDATE
SET
    "email" = COALESCE(contacts."email", EXCLUDED."email"),
    "phone_number" = COALESCE(contacts."phone_number", EXCLUDED."phone_number");

-- Authentication and OAuth data belong to auth_service. The user schema keeps
-- only the local user anchor, profile data, contacts, and resumes.
DROP TABLE IF EXISTS "user"."external_accounts";

ALTER TABLE "user"."users"
    ALTER COLUMN "id" DROP DEFAULT,
    DROP COLUMN IF EXISTS "email",
    DROP COLUMN IF EXISTS "phone_number",
    DROP COLUMN IF EXISTS "password_hash",
    DROP COLUMN IF EXISTS "roles",
    DROP COLUMN IF EXISTS "status",
    DROP COLUMN IF EXISTS "email_verified_at",
    DROP COLUMN IF EXISTS "phone_verified_at",
    DROP COLUMN IF EXISTS "last_login_at";

CREATE INDEX "users_created_at_idx"
    ON "user"."users" ("created_at" DESC);

DROP TYPE IF EXISTS "user"."user_role";
DROP TYPE IF EXISTS "user"."user_status";
