-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "sale_id" INTEGER,
ADD COLUMN     "total_value" DECIMAL(10,2),
ADD COLUMN     "unit_cost" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "inventory_movements_sale_id_idx" ON "inventory_movements"("sale_id");
