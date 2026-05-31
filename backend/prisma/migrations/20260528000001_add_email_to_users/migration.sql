-- Add email column to users (separate from upn which is the login identifier)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" TEXT;
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
