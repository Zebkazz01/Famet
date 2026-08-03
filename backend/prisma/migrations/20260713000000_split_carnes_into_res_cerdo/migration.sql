-- Create "Res" category
INSERT INTO "categories" ("name", "color", "active", "created_at", "updated_at")
VALUES ('Res', '#DC2626', true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- Create "Cerdo" category
INSERT INTO "categories" ("name", "color", "active", "created_at", "updated_at")
VALUES ('Cerdo', '#F59E0B', true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- Move products with animalType RES to "Res" category
UPDATE "products" 
SET "category_id" = (SELECT id FROM "categories" WHERE "name" = 'Res')
WHERE "animal_type" = 'RES';

-- Move products with animalType CERDO to "Cerdo" category
UPDATE "products" 
SET "category_id" = (SELECT id FROM "categories" WHERE "name" = 'Cerdo')
WHERE "animal_type" = 'CERDO';

-- Deactivate the old "Carnes" category (keep data for historical reference)
UPDATE "categories" SET "active" = false WHERE "name" = 'Carnes';
