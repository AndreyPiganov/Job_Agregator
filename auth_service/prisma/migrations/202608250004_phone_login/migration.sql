ALTER TABLE "auth"."identities"
  ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "auth"."identities"
  ADD CONSTRAINT "identities_login_identifier_check"
  CHECK ("email" IS NOT NULL OR "phone_number" IS NOT NULL);
