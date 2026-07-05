-- CreateEnum
CREATE TYPE "AnimalType" AS ENUM ('RES', 'CERDO', 'POLLO', 'PESCADO', 'CORDERO', 'CABRA', 'MARISCO', 'OTRO');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "animal_part" TEXT,
ADD COLUMN     "animal_type" "AnimalType";
