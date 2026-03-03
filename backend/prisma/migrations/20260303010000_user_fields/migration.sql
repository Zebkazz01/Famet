-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'DISABLED');

-- AlterTable: add new columns with defaults for existing rows
ALTER TABLE "users" ADD COLUMN "cedula" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "first_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "last_name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "recovery_code" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- Migrate data: split name into first_name/last_name
UPDATE "users" SET "first_name" = SPLIT_PART("name", ' ', 1),
                   "last_name" = COALESCE(NULLIF(SUBSTRING("name" FROM POSITION(' ' IN "name") + 1), ''), '-');

-- Set cedula for existing users
UPDATE "users" SET "cedula" = '0000000000' WHERE "username" = 'admin';
UPDATE "users" SET "cedula" = '1111111111' WHERE "username" = 'cajero1';

-- Generate recovery codes for existing users
UPDATE "users" SET "recovery_code" = UPPER(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT)::VARCHAR(8));

-- Set status from active flag
UPDATE "users" SET "status" = CASE WHEN "active" = true THEN 'ACTIVE'::"UserStatus" ELSE 'DISABLED'::"UserStatus" END;

-- Drop old columns
ALTER TABLE "users" DROP COLUMN "name";
ALTER TABLE "users" DROP COLUMN "active";

-- Remove defaults (schema doesn't have them)
ALTER TABLE "users" ALTER COLUMN "cedula" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "first_name" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "last_name" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "recovery_code" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "users_cedula_key" ON "users"("cedula");
