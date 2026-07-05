-- CreateEnum
CREATE TYPE "BarcodeAliasStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "has_batches" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "category_barcodes" (
    "id" SERIAL NOT NULL,
    "barcode" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "last_product_id" INTEGER,
    "status" "BarcodeAliasStatus" NOT NULL DEFAULT 'ACTIVE',
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "times_seen" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "category_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_batches" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "batch_code" TEXT,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "qty" DECIMAL(10,3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_barcodes_barcode_key" ON "category_barcodes"("barcode");

-- CreateIndex
CREATE INDEX "category_barcodes_category_id_idx" ON "category_barcodes"("category_id");

-- CreateIndex
CREATE INDEX "category_barcodes_last_product_id_idx" ON "category_barcodes"("last_product_id");

-- CreateIndex
CREATE INDEX "product_batches_product_id_expiry_date_idx" ON "product_batches"("product_id", "expiry_date");

-- CreateIndex
CREATE INDEX "product_batches_expiry_date_idx" ON "product_batches"("expiry_date");

-- AddForeignKey
ALTER TABLE "category_barcodes" ADD CONSTRAINT "category_barcodes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_barcodes" ADD CONSTRAINT "category_barcodes_last_product_id_fkey" FOREIGN KEY ("last_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
