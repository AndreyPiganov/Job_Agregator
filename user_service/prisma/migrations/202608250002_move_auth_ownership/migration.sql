-- Existing non-empty installations must deploy the auth_service identity
-- migration first. Refuse to discard credential data that has not been copied.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "user"."users") AND (
        to_regclass('"auth"."identities"') IS NULL OR
        EXISTS (
            SELECT 1
            FROM "user"."users" AS u
            WHERE NOT EXISTS (SELECT 1 FROM "auth"."identities" AS i WHERE i."id" = u."id")
        )
    ) THEN
        RAISE EXCEPTION 'deploy auth_service migration 202608250001_identity_credentials before user_service cleanup';
    END IF;
END $$;

DROP TABLE IF EXISTS "user"."external_accounts";

DROP INDEX IF EXISTS "user"."users_email_key";
DROP INDEX IF EXISTS "user"."users_phone_number_key";
DROP INDEX IF EXISTS "user"."users_status_created_at_idx";

ALTER TABLE "user"."users"
    ALTER COLUMN "id" DROP DEFAULT,
    DROP COLUMN "email",
    DROP COLUMN "phone_number",
    DROP COLUMN "password_hash",
    DROP COLUMN "roles",
    DROP COLUMN "status",
    DROP COLUMN "email_verified_at",
    DROP COLUMN "phone_verified_at",
    DROP COLUMN "last_login_at";

CREATE INDEX "users_created_at_idx" ON "user"."users"("created_at" DESC);

DROP TYPE "user"."user_role";
DROP TYPE "user"."user_status";
