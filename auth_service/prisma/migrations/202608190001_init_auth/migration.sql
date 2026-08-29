CREATE SCHEMA IF NOT EXISTS "auth";

CREATE TYPE "auth"."EmailCodePurpose" AS ENUM ('REGISTRATION', 'PASSWORD_RESET');

CREATE TABLE "auth"."email_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "code_hash" VARCHAR(128) NOT NULL,
    "purpose" "auth"."EmailCodePurpose" NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_codes_email_purpose_created_at_idx"
    ON "auth"."email_codes"("email", "purpose", "created_at" DESC);
CREATE INDEX "email_codes_expires_at_idx" ON "auth"."email_codes"("expires_at");
