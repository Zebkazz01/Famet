-- AlterTable
ALTER TABLE "products" ADD COLUMN     "animal_part" TEXT,
ADD COLUMN     "animal_type" "AnimalType",
ADD COLUMN     "cooking_methods" JSONB NOT NULL DEFAULT '[]';
