-- Rename email -> upn
ALTER TABLE "users" RENAME COLUMN "email" TO "upn";

-- Rename unique index
ALTER INDEX "users_email_key" RENAME TO "users_upn_key";

-- Add missing registrationData column
ALTER TABLE "users" ADD COLUMN "registrationData" JSONB;
