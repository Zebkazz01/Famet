-- AlterTable
ALTER TABLE "cash_movements" ADD COLUMN     "reference_id" INTEGER,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';
