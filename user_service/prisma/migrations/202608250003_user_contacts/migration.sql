CREATE TABLE "user"."user_contacts" (
    "user_id" UUID NOT NULL,
    "email" VARCHAR(320),
    "phone_number" VARCHAR(20),
    "telegram_username" VARCHAR(32),
    "github_username" VARCHAR(39),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_contacts_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "user"."user_contacts"
    ADD CONSTRAINT "user_contacts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
