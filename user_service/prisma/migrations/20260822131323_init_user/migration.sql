-- Keep all objects owned by user_service inside its PostgreSQL schema even
-- when this script is inspected or executed outside Prisma.
CREATE SCHEMA IF NOT EXISTS "user";
SET search_path TO "user";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('APPLICANT', 'EMPLOYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "resume_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "resume_visibility" AS ENUM ('PUBLIC', 'REGISTERED_EMPLOYERS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "search_status" AS ENUM ('ACTIVE_SEARCH', 'OPEN_TO_OFFERS', 'NOT_SEARCHING', 'FOUND_JOB');

-- CreateEnum
CREATE TYPE "relocation_readiness" AS ENUM ('NOT_READY', 'POSSIBLE', 'READY');

-- CreateEnum
CREATE TYPE "business_trip_readiness" AS ENUM ('NEVER', 'SOMETIMES', 'READY');

-- CreateEnum
CREATE TYPE "proficiency_level" AS ENUM ('BEGINNER_A1', 'ELEMENTARY_A2', 'INTERMEDIATE_B1', 'UPPER_INTERMEDIATE_B2', 'ADVANCED_C1', 'NATIVE_C2');

-- CreateEnum
CREATE TYPE "education_level" AS ENUM ('SECONDARY', 'SPECIAL_SECONDARY', 'UNFINISHED_HIGHER', 'BACHELOR', 'MASTER', 'HIGHER', 'PHD');

-- CreateEnum
CREATE TYPE "experience_level" AS ENUM ('NO_EXPERIENCE', 'ONE_TO_THREE_YEARS', 'THREE_TO_SIX_YEARS', 'MORE_THAN_SIX_YEARS');

-- CreateEnum
CREATE TYPE "employment_type" AS ENUM ('FULL_TIME', 'PART_TIME', 'PROJECT', 'INTERNSHIP', 'TEMPORARY', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "work_schedule" AS ENUM ('FULL_DAY', 'SHIFT', 'FLEXIBLE', 'ROTATION');

-- CreateEnum
CREATE TYPE "work_format" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID', 'FIELD');

-- CreateEnum
CREATE TYPE "vacancy_search_field" AS ENUM ('TITLE', 'DESCRIPTION', 'COMPANY_NAME');

-- CreateEnum
CREATE TYPE "vacancy_search_sort" AS ENUM ('RELEVANCE', 'DATE_DESC', 'DATE_ASC', 'SALARY_DESC', 'SALARY_ASC');

-- CreateEnum
CREATE TYPE "search_notification_frequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "phone_number" VARCHAR(20),
    "password_hash" VARCHAR(255),
    "roles" "user_role"[] DEFAULT ARRAY['APPLICANT']::"user_role"[],
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ(3),
    "phone_verified_at" TIMESTAMPTZ(3),
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(320),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "external_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "birth_date" DATE,
    "gender" "gender",
    "city" VARCHAR(120),
    "photo_url" VARCHAR(2048),
    "about" TEXT,
    "relocation_readiness" "relocation_readiness",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_languages" (
    "user_id" UUID NOT NULL,
    "language_code" VARCHAR(10) NOT NULL,
    "proficiency" "proficiency_level" NOT NULL,

    CONSTRAINT "user_languages_pkey" PRIMARY KEY ("user_id","language_code")
);

-- CreateTable
CREATE TABLE "user_citizenships" (
    "user_id" UUID NOT NULL,
    "country_code" CHAR(2) NOT NULL,

    CONSTRAINT "user_citizenships_pkey" PRIMARY KEY ("user_id","country_code")
);

-- CreateTable
CREATE TABLE "countries" (
    "code" CHAR(2) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "languages" (
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "about" TEXT,
    "city" VARCHAR(120),
    "status" "resume_status" NOT NULL DEFAULT 'DRAFT',
    "visibility" "resume_visibility" NOT NULL DEFAULT 'REGISTERED_EMPLOYERS',
    "search_status" "search_status" NOT NULL DEFAULT 'ACTIVE_SEARCH',
    "business_trip_readiness" "business_trip_readiness",
    "salary_amount" INTEGER,
    "salary_currency" CHAR(3),
    "total_experience_months" INTEGER NOT NULL DEFAULT 0,
    "employment_types" "employment_type"[],
    "work_schedules" "work_schedule"[],
    "work_formats" "work_format"[],
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "impressions_count" INTEGER NOT NULL DEFAULT 0,
    "invitations_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "specialization_id" INTEGER,
    "institution_name" VARCHAR(200) NOT NULL,
    "level" "education_level" NOT NULL,
    "faculty" VARCHAR(200),
    "started_at" DATE,
    "ended_at" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_specializations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "education_specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "position" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "city" VARCHAR(120),
    "company_url" VARCHAR(2048),
    "started_at" DATE NOT NULL,
    "ended_at" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_educations" (
    "resume_id" UUID NOT NULL,
    "education_id" UUID NOT NULL,

    CONSTRAINT "resume_educations_pkey" PRIMARY KEY ("resume_id","education_id")
);

-- CreateTable
CREATE TABLE "resume_work_experiences" (
    "resume_id" UUID NOT NULL,
    "work_experience_id" UUID NOT NULL,

    CONSTRAINT "resume_work_experiences_pkey" PRIMARY KEY ("resume_id","work_experience_id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resume_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "issuer" VARCHAR(200),
    "url" VARCHAR(2048),
    "achieved_at" DATE,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_skills" (
    "resume_id" UUID NOT NULL,
    "skill_id" INTEGER NOT NULL,

    CONSTRAINT "resume_skills_pkey" PRIMARY KEY ("resume_id","skill_id")
);

-- CreateTable
CREATE TABLE "professional_roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,

    CONSTRAINT "professional_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_professional_roles" (
    "resume_id" UUID NOT NULL,
    "professional_role_id" INTEGER NOT NULL,

    CONSTRAINT "resume_professional_roles_pkey" PRIMARY KEY ("resume_id","professional_role_id")
);

-- CreateTable
CREATE TABLE "saved_vacancy_searches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "query" VARCHAR(500),
    "excluded_words" VARCHAR(500),
    "search_fields" "vacancy_search_field"[] DEFAULT ARRAY['TITLE', 'DESCRIPTION', 'COMPANY_NAME']::"vacancy_search_field"[],
    "cities" TEXT[],
    "company_names" TEXT[],
    "industry_ids" TEXT[],
    "min_salary" INTEGER,
    "max_salary" INTEGER,
    "salary_currency" CHAR(3),
    "experience_levels" "experience_level"[],
    "employment_types" "employment_type"[],
    "work_schedules" "work_schedule"[],
    "work_formats" "work_format"[],
    "only_with_salary" BOOLEAN NOT NULL DEFAULT false,
    "publication_period_days" SMALLINT,
    "sort" "vacancy_search_sort" NOT NULL DEFAULT 'RELEVANCE',
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT false,
    "notification_frequency" "search_notification_frequency" NOT NULL DEFAULT 'DAILY',
    "last_run_at" TIMESTAMPTZ(3),
    "last_notified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "saved_vacancy_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_search_professional_roles" (
    "saved_search_id" UUID NOT NULL,
    "professional_role_id" INTEGER NOT NULL,

    CONSTRAINT "saved_search_professional_roles_pkey" PRIMARY KEY ("saved_search_id","professional_role_id")
);

-- CreateTable
CREATE TABLE "favorite_vacancies" (
    "user_id" UUID NOT NULL,
    "vacancy_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_vacancies_pkey" PRIMARY KEY ("user_id","vacancy_id")
);

-- CreateTable
CREATE TABLE "hidden_vacancies" (
    "user_id" UUID NOT NULL,
    "vacancy_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hidden_vacancies_pkey" PRIMARY KEY ("user_id","vacancy_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "external_accounts_user_id_idx" ON "external_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_accounts_provider_provider_account_id_key" ON "external_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "user_profiles_city_idx" ON "user_profiles"("city");

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "languages_name_key" ON "languages"("name");

-- CreateIndex
CREATE INDEX "resumes_user_id_updated_at_idx" ON "resumes"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "resumes_status_search_status_idx" ON "resumes"("status", "search_status");

-- CreateIndex
CREATE INDEX "resumes_city_idx" ON "resumes"("city");

-- CreateIndex
CREATE INDEX "resumes_salary_amount_idx" ON "resumes"("salary_amount");

-- CreateIndex
CREATE INDEX "educations_user_id_ended_at_idx" ON "educations"("user_id", "ended_at" DESC);

-- CreateIndex
CREATE INDEX "educations_specialization_id_idx" ON "educations"("specialization_id");

-- CreateIndex
CREATE UNIQUE INDEX "education_specializations_name_key" ON "education_specializations"("name");

-- CreateIndex
CREATE INDEX "work_experiences_user_id_started_at_idx" ON "work_experiences"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "resume_educations_education_id_idx" ON "resume_educations"("education_id");

-- CreateIndex
CREATE INDEX "resume_work_experiences_work_experience_id_idx" ON "resume_work_experiences"("work_experience_id");

-- CreateIndex
CREATE INDEX "certificates_resume_id_idx" ON "certificates"("resume_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "professional_roles_name_key" ON "professional_roles"("name");

-- CreateIndex
CREATE INDEX "saved_vacancy_searches_user_id_updated_at_idx" ON "saved_vacancy_searches"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "saved_vacancy_searches_notifications_enabled_notification_f_idx" ON "saved_vacancy_searches"("notifications_enabled", "notification_frequency");

-- CreateIndex
CREATE UNIQUE INDEX "saved_vacancy_searches_user_id_name_key" ON "saved_vacancy_searches"("user_id", "name");

-- CreateIndex
CREATE INDEX "favorite_vacancies_user_id_created_at_idx" ON "favorite_vacancies"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "hidden_vacancies_user_id_created_at_idx" ON "hidden_vacancies"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "external_accounts" ADD CONSTRAINT "external_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_language_code_fkey" FOREIGN KEY ("language_code") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_citizenships" ADD CONSTRAINT "user_citizenships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_citizenships" ADD CONSTRAINT "user_citizenships_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educations" ADD CONSTRAINT "educations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educations" ADD CONSTRAINT "educations_specialization_id_fkey" FOREIGN KEY ("specialization_id") REFERENCES "education_specializations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_educations" ADD CONSTRAINT "resume_educations_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_educations" ADD CONSTRAINT "resume_educations_education_id_fkey" FOREIGN KEY ("education_id") REFERENCES "educations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_work_experiences" ADD CONSTRAINT "resume_work_experiences_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_work_experiences" ADD CONSTRAINT "resume_work_experiences_work_experience_id_fkey" FOREIGN KEY ("work_experience_id") REFERENCES "work_experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_skills" ADD CONSTRAINT "resume_skills_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_skills" ADD CONSTRAINT "resume_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_professional_roles" ADD CONSTRAINT "resume_professional_roles_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_professional_roles" ADD CONSTRAINT "resume_professional_roles_professional_role_id_fkey" FOREIGN KEY ("professional_role_id") REFERENCES "professional_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_vacancy_searches" ADD CONSTRAINT "saved_vacancy_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_search_professional_roles" ADD CONSTRAINT "saved_search_professional_roles_saved_search_id_fkey" FOREIGN KEY ("saved_search_id") REFERENCES "saved_vacancy_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_search_professional_roles" ADD CONSTRAINT "saved_search_professional_roles_professional_role_id_fkey" FOREIGN KEY ("professional_role_id") REFERENCES "professional_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_vacancies" ADD CONSTRAINT "favorite_vacancies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_vacancies" ADD CONSTRAINT "hidden_vacancies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
