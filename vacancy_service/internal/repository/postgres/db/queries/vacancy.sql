-- sqlc reads this file and generates Go methods from each annotated query.
-- Example: "-- name: ListVacancies :many" becomes queries.ListVacancies(ctx, params).

-- name: ListVacancies :many
SELECT 
    sqlc.embed(vacancy),
    sqlc.embed(company)
FROM "Vacancy" vacancy
JOIN "Company" company ON company."id" = vacancy."companyId"
ORDER BY vacancy."createdAt" DESC, vacancy."id" DESC
LIMIT $1 OFFSET $2;

-- name: GetVacancyByID :one
SELECT 
    sqlc.embed(vacancy),
    sqlc.embed(company)
FROM "Vacancy" vacancy
JOIN "Company" company ON company."id" = vacancy."companyId"
WHERE vacancy."id" = $1;

-- name: UpsertCompany :one
INSERT INTO "Company" ("name")
VALUES ($1)
ON CONFLICT ("name") DO UPDATE SET "name" = EXCLUDED."name"
RETURNING "id";

-- name: UpsertVacancy :one
-- Upsert means: insert if link is new, update if link already exists.
-- This is important for parser imports where the same vacancy can be seen repeatedly.
INSERT INTO "Vacancy" ("title", "description", "companyId", "salary", "link", "city", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
ON CONFLICT ("link") DO UPDATE SET
    "title" = EXCLUDED."title",
    "description" = EXCLUDED."description",
    "companyId" = EXCLUDED."companyId",
    "salary" = EXCLUDED."salary",
    "city" = EXCLUDED."city",
    "updatedAt" = CURRENT_TIMESTAMP
RETURNING
    "id" AS id,
    "title" AS title,
    "description" AS description,
    "companyId" AS company_id,
    "salary" AS salary,
    "link" AS link,
    "city" AS city,
    "createdAt" AS created_at,
    "updatedAt" AS updated_at;

-- name: ListVacanciesByCompany :many
SELECT
    sqlc.embed(vacancy),
    sqlc.embed(company)
FROM "Vacancy" vacancy
JOIN "Company" company ON company."id" = vacancy."companyId"
WHERE company."name" = $1
ORDER BY vacancy."createdAt" DESC, vacancy."id" DESC;

-- name: ListVacanciesBySalaryRange :many
SELECT
    sqlc.embed(vacancy),
    sqlc.embed(company)
FROM "Vacancy" vacancy
JOIN "Company" company ON company."id" = vacancy."companyId"
WHERE vacancy."salary" >= $1 AND vacancy."salary" <= $2
ORDER BY vacancy."salary" DESC, vacancy."createdAt" DESC;
