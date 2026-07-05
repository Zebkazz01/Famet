-- CreateTable
CREATE TABLE "animal_parts" (
    "id" SERIAL NOT NULL,
    "animal_type" "AnimalType" NOT NULL,
    "name" TEXT NOT NULL,
    "custom" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "animal_parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "animal_parts_animal_type_idx" ON "animal_parts"("animal_type");

-- CreateIndex
CREATE UNIQUE INDEX "animal_parts_animal_type_name_key" ON "animal_parts"("animal_type", "name");
