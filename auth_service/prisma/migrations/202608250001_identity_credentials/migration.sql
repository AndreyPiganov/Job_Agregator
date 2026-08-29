CREATE TYPE "auth"."identity_role" AS ENUM ('APPLICANT', 'EMPLOYER', 'ADMIN');
CREATE TYPE "auth"."identity_status" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED', 'DELETED');

CREATE TABLE "auth"."identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "phone_number" VARCHAR(20),
    "roles" "auth"."identity_role"[] NOT NULL DEFAULT ARRAY['APPLICANT']::"auth"."identity_role"[],
    "status" "auth"."identity_status" NOT NULL DEFAULT 'PENDING',
    "email_verified_at" TIMESTAMPTZ(3),
    "phone_verified_at" TIMESTAMPTZ(3),
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth"."password_credentials" (
    "identity_id" UUID NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "password_changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "password_credentials_pkey" PRIMARY KEY ("identity_id")
);

CREATE TABLE "auth"."external_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identity_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_subject" VARCHAR(255) NOT NULL,
    "email" VARCHAR(320),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "external_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "identities_email_key" ON "auth"."identities"("email");
CREATE UNIQUE INDEX "identities_phone_number_key" ON "auth"."identities"("phone_number");
CREATE INDEX "identities_status_created_at_idx" ON "auth"."identities"("status", "created_at" DESC);
CREATE INDEX "external_identities_identity_id_idx" ON "auth"."external_identities"("identity_id");
CREATE UNIQUE INDEX "external_identities_provider_provider_subject_key"
    ON "auth"."external_identities"("provider", "provider_subject");

ALTER TABLE "auth"."password_credentials"
    ADD CONSTRAINT "password_credentials_identity_id_fkey"
    FOREIGN KEY ("identity_id") REFERENCES "auth"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth"."external_identities"
    ADD CONSTRAINT "external_identities_identity_id_fkey"
    FOREIGN KEY ("identity_id") REFERENCES "auth"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Staged ownership transfer for existing development data. This block is a
-- no-op on a fresh database or after user_service has already been cleaned.
DO $$
BEGIN
    IF to_regclass('"user"."users"') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'user' AND table_name = 'users' AND column_name = 'email'
       ) THEN
        EXECUTE $copy_identities$
            INSERT INTO "auth"."identities" (
                "id", "email", "phone_number", "roles", "status",
                "email_verified_at", "phone_verified_at", "last_login_at", "created_at", "updated_at"
            )
            SELECT
                u."id",
                lower(u."email"),
                u."phone_number",
                ARRAY(
                    SELECT role::text::"auth"."identity_role"
                    FROM unnest(u."roles") AS role
                ),
                u."status"::text::"auth"."identity_status",
                u."email_verified_at",
                u."phone_verified_at",
                u."last_login_at",
                u."created_at",
                u."updated_at"
            FROM "user"."users" AS u
            ON CONFLICT ("id") DO NOTHING
        $copy_identities$;

        EXECUTE $copy_passwords$
            INSERT INTO "auth"."password_credentials" (
                "identity_id", "password_hash", "password_changed_at", "created_at", "updated_at"
            )
            SELECT u."id", u."password_hash", u."updated_at", u."created_at", u."updated_at"
            FROM "user"."users" AS u
            WHERE u."password_hash" IS NOT NULL
            ON CONFLICT ("identity_id") DO NOTHING
        $copy_passwords$;
    END IF;

    IF to_regclass('"user"."external_accounts"') IS NOT NULL THEN
        EXECUTE $copy_external$
            INSERT INTO "auth"."external_identities" (
                "id", "identity_id", "provider", "provider_subject", "email", "created_at", "updated_at"
            )
            SELECT
                e."id", e."user_id", e."provider", e."provider_account_id", e."email", e."created_at", e."updated_at"
            FROM "user"."external_accounts" AS e
            JOIN "auth"."identities" AS i ON i."id" = e."user_id"
            ON CONFLICT ("id") DO NOTHING
        $copy_external$;
    END IF;
END $$;
