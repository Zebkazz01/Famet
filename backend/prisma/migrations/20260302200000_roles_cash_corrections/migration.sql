-- Rename CASHIER to VENDEDOR in Role enum
ALTER TYPE "Role" RENAME VALUE 'CASHIER' TO 'VENDEDOR';

-- Add SUPERVISOR to Role enum
ALTER TYPE "Role" ADD VALUE 'SUPERVISOR';

-- Create CashMovementType enum
CREATE TYPE "CashMovementType" AS ENUM ('CASH_IN', 'CASH_OUT');

-- Add correction fields to sales
ALTER TABLE "sales" ADD COLUMN "corrected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sales" ADD COLUMN "correction_reason" TEXT;
ALTER TABLE "sales" ADD COLUMN "corrected_by" INTEGER;
ALTER TABLE "sales" ADD COLUMN "corrected_at" TIMESTAMP(3);

-- Add userId to inventory_movements for traceability
ALTER TABLE "inventory_movements" ADD COLUMN "user_id" INTEGER;

-- Create cash_movements table
CREATE TABLE "cash_movements" (
    "id" SERIAL NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- Create cash_closings table
CREATE TABLE "cash_closings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expected_amount" DECIMAL(10,2) NOT NULL,
    "actual_amount" DECIMAL(10,2) NOT NULL,
    "difference" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_closings_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
