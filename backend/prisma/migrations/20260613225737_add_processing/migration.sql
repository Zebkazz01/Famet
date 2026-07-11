-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MovementType" ADD VALUE 'PROCESSING_OUTPUT';
ALTER TYPE "MovementType" ADD VALUE 'PROCESSING_INPUT';

-- CreateTable
CREATE TABLE "processing_batches" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "animal_type" "AnimalType" NOT NULL,
    "input_product_id" INTEGER NOT NULL,
    "input_weight_kg" DECIMAL(10,3) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "waste_weight_kg" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "processed_by" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_outputs" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "weight_kg" DECIMAL(10,3) NOT NULL,
    "cost_per_kg" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "sale_price_per_kg" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "processing_batches_code_key" ON "processing_batches"("code");

-- CreateIndex
CREATE INDEX "processing_batches_status_idx" ON "processing_batches"("status");

-- CreateIndex
CREATE INDEX "processing_batches_created_at_idx" ON "processing_batches"("created_at");

-- CreateIndex
CREATE INDEX "processing_outputs_batch_id_idx" ON "processing_outputs"("batch_id");

-- CreateIndex
CREATE INDEX "processing_outputs_product_id_idx" ON "processing_outputs"("product_id");

-- AddForeignKey
ALTER TABLE "processing_batches" ADD CONSTRAINT "processing_batches_input_product_id_fkey" FOREIGN KEY ("input_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_batches" ADD CONSTRAINT "processing_batches_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_outputs" ADD CONSTRAINT "processing_outputs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "processing_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_outputs" ADD CONSTRAINT "processing_outputs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
