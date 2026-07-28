-- This schema is used by two things:
-- 1. The service startup migration in internal/db/migrate.go.
-- 2. sqlc code generation, so generated Go types match the database shape.

CREATE TABLE IF NOT EXISTS "Company" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "Vacancy" (
    "id" SERIAL PRIMARY KEY,
    "title" VARCHAR NOT NULL,
    "description" VARCHAR NOT NULL,
    "companyId" INTEGER NOT NULL REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "salary" DOUBLE PRECISION NOT NULL,
    "link" VARCHAR NOT NULL UNIQUE,
    "city" VARCHAR NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- link is unique because parser_service may send the same vacancy again.
-- With this index, UpsertVacancy can update the existing row instead of duplicating it.
CREATE UNIQUE INDEX IF NOT EXISTS "Vacancy_link_key" ON "Vacancy"("link");
CREATE INDEX IF NOT EXISTS "Vacancy_companyId_idx" ON "Vacancy"("companyId");
CREATE INDEX IF NOT EXISTS "Vacancy_city_idx" ON "Vacancy"("city");
CREATE INDEX IF NOT EXISTS "Vacancy_salary_idx" ON "Vacancy"("salary");
CREATE INDEX IF NOT EXISTS "Vacancy_createdAt_idx" ON "Vacancy"("createdAt");
