-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "cooking_methods" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "parent_id" INTEGER;

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
