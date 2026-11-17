BEGIN;

-- La migración se detiene ante datos históricos que requieren una decisión humana.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Incident" i LEFT JOIN "citizens" c ON c."user_id" = i."civicId" WHERE c."user_id" IS NULL) THEN
        RAISE EXCEPTION 'Hay incidencias con civicId sin ciudadano; corregirlas antes de migrar';
    END IF;
    IF EXISTS (SELECT 1 FROM "Incident" WHERE "categoryId" IS NOT NULL AND ("category" IS NULL OR btrim("category") = '')) THEN
        RAISE EXCEPTION 'Hay categoryId sin nombre; completar el catálogo antes de migrar';
    END IF;
    IF EXISTS (
        SELECT 1 FROM "Incident" WHERE "categoryId" IS NOT NULL
        GROUP BY "categoryId" HAVING count(DISTINCT lower(btrim("category"))) > 1
    ) OR EXISTS (
        SELECT 1 FROM "Incident" WHERE "categoryId" IS NOT NULL
        GROUP BY lower(btrim("category")) HAVING count(DISTINCT "categoryId") > 1
    ) THEN
        RAISE EXCEPTION 'Los nombres e identificadores de categoría no son unívocos';
    END IF;
    IF EXISTS (SELECT 1 FROM "status_changes" s LEFT JOIN "users" u ON u."id" = s."user_id" WHERE u."id" IS NULL)
        OR EXISTS (SELECT 1 FROM "priority_changes" p LEFT JOIN "users" u ON u."id" = p."user_id" WHERE p."user_id" IS NOT NULL AND u."id" IS NULL) THEN
        RAISE EXCEPTION 'Hay actores de historial sin usuario; corregirlos antes de migrar';
    END IF;
    IF EXISTS (
        SELECT 1 FROM "Incident" i WHERE
            (i."teamId" IS NOT NULL AND i."departmentId" IS NULL)
            OR (i."technicianId" IS NOT NULL AND i."teamId" IS NULL)
            OR (i."teamId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Team" t WHERE t."id" = i."teamId" AND t."departmentId" = i."departmentId"))
            OR (i."technicianId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "TeamMember" m WHERE m."userId" = i."technicianId" AND m."teamId" = i."teamId" AND m."isTechnician"))
    ) THEN
        RAISE EXCEPTION 'Hay asignaciones incoherentes; corregirlas antes de migrar';
    END IF;
    IF EXISTS (SELECT 1 FROM "IncidentLocation" WHERE
        ("latitude" IS NULL AND "longitude" IS NOT NULL)
        OR ("latitude" IS NOT NULL AND "longitude" IS NULL)
        OR ("accuracy" IS NOT NULL AND ("latitude" IS NULL OR "longitude" IS NULL))
        OR "latitude" NOT BETWEEN -90 AND 90
        OR "longitude" NOT BETWEEN -180 AND 180
        OR "accuracy" < 0
    ) THEN
        RAISE EXCEPTION 'Hay ubicaciones incompletas o fuera de rango; corregirlas antes de migrar';
    END IF;
    IF EXISTS (SELECT 1 FROM "Incident" WHERE char_length("title") NOT BETWEEN 4 AND 35) THEN
        RAISE EXCEPTION 'Hay títulos fuera del límite de 4 a 35 caracteres';
    END IF;
    IF EXISTS (SELECT 1 FROM "Incident" WHERE "description" IS NOT NULL AND char_length("description") < 10) THEN
        RAISE EXCEPTION 'Hay descripciones con menos de 10 caracteres';
    END IF;
    IF EXISTS (SELECT 1 FROM "priority_changes" WHERE ("is_manual" AND "user_id" IS NULL) OR (NOT "is_manual" AND "user_id" IS NOT NULL)) THEN
        RAISE EXCEPTION 'Hay cambios de prioridad con origen y usuario incompatibles';
    END IF;
END $$;

-- El código antiguo creó filas sin coordenadas; no contienen ubicación útil.
DELETE FROM "IncidentLocation"
WHERE "latitude" IS NULL AND "longitude" IS NULL AND "accuracy" IS NULL;

ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'resolved';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'reopened';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'closed';

CREATE TYPE "AddressDistrict" AS ENUM (
    'centro', 'este', 'ciudad_jardin', 'bailen_miraflores', 'palma_palmilla',
    'cruz_del_humilladero', 'carretera_de_cadiz', 'churriana', 'campanillas',
    'puerto_de_la_torre', 'teatinos_universidad'
);

-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_technicianId_fkey";

-- DropIndex
DROP INDEX "Incident_technicianId_idx";

-- AlterTable
ALTER TABLE "priority_changes" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "priority_changes" ALTER COLUMN "is_manual" DROP DEFAULT;

ALTER TABLE "IncidentLocation" ADD COLUMN "addressId" UUID;

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UrbanAsset" (
    "id" UUID NOT NULL,
    "name" TEXT,

    CONSTRAINT "UrbanAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Address" (
    "id" UUID NOT NULL,
    "street" TEXT NOT NULL,
    "zipCode" VARCHAR(5) NOT NULL,
    "district" "AddressDistrict" NOT NULL,
    CONSTRAINT "Address_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Address_street_check" CHECK (btrim("street") <> ''),
    CONSTRAINT "Address_zip_code_check" CHECK ("zipCode" ~ '^[0-9]{5}$')
);

CREATE TABLE "UrbanContext" (
    "id" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "weather" TEXT,
    "traffic" TEXT,
    "mobility" TEXT,
    "environment" TEXT,
    "demography" INTEGER,
    CONSTRAINT "UrbanContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_normalizedName_key" ON "Category"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "UrbanAsset_name_key" ON "UrbanAsset"("name");
CREATE UNIQUE INDEX "Address_street_zipCode_district_key" ON "Address"("street", "zipCode", "district");
CREATE UNIQUE INDEX "UrbanContext_locationId_key" ON "UrbanContext"("locationId");
CREATE INDEX "IncidentLocation_addressId_idx" ON "IncidentLocation"("addressId");

-- Conservar las referencias a activos aunque todavía se desconozca su nombre.
INSERT INTO "UrbanAsset" ("id")
SELECT DISTINCT "urbanAssetId" FROM "Incident" WHERE "urbanAssetId" IS NOT NULL;

-- Conservar los UUID históricos y persistir el catálogo inicial una sola vez.
INSERT INTO "Category" ("id", "name", "normalizedName")
SELECT DISTINCT ON ("categoryId") "categoryId", btrim("category"), lower(btrim("category"))
FROM "Incident" WHERE "categoryId" IS NOT NULL
ORDER BY "categoryId", "createdAt";

INSERT INTO "Category" ("id", "name", "normalizedName") VALUES
(gen_random_uuid(), 'Iluminación', lower('Iluminación')),
(gen_random_uuid(), 'Limpieza', lower('Limpieza')),
(gen_random_uuid(), 'Vía pública', lower('Vía pública')),
(gen_random_uuid(), 'Movilidad', lower('Movilidad')),
(gen_random_uuid(), 'Zonas verdes', lower('Zonas verdes'))
ON CONFLICT ("normalizedName") DO NOTHING;

INSERT INTO "Category" ("id", "name", "normalizedName")
SELECT gen_random_uuid(), btrim(i."category"), lower(btrim(i."category"))
FROM "Incident" i
WHERE i."categoryId" IS NULL AND i."category" IS NOT NULL AND btrim(i."category") <> ''
GROUP BY lower(btrim(i."category")), btrim(i."category")
ON CONFLICT ("normalizedName") DO NOTHING;

UPDATE "Incident" i SET "categoryId" = c."id"
FROM "Category" c
WHERE i."categoryId" IS NULL AND i."category" IS NOT NULL
  AND lower(btrim(i."category")) = c."normalizedName";

-- CreateIndex
CREATE INDEX "Incident_civicId_createdAt_id_idx" ON "Incident"("civicId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Incident_categoryId_idx" ON "Incident"("categoryId");

-- CreateIndex
CREATE INDEX "Incident_urbanAssetId_idx" ON "Incident"("urbanAssetId");

-- CreateIndex
CREATE INDEX "Incident_technicianId_teamId_idx" ON "Incident"("technicianId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_id_departmentId_key" ON "Team"("id", "departmentId");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_civicId_fkey" FOREIGN KEY ("civicId") REFERENCES "citizens"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_urbanAssetId_fkey" FOREIGN KEY ("urbanAssetId") REFERENCES "UrbanAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_teamId_departmentId_fkey" FOREIGN KEY ("teamId", "departmentId") REFERENCES "Team"("id", "departmentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_technicianId_teamId_fkey" FOREIGN KEY ("technicianId", "teamId") REFERENCES "TeamMember"("userId", "teamId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_changes" ADD CONSTRAINT "status_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_changes" ADD CONSTRAINT "priority_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncidentLocation" ADD CONSTRAINT "IncidentLocation_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UrbanContext" ADD CONSTRAINT "UrbanContext_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "IncidentLocation"("incidentId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assignment_levels_check"
    CHECK (("teamId" IS NULL OR "departmentId" IS NOT NULL)
       AND ("technicianId" IS NULL OR "teamId" IS NOT NULL));
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_title_length_check"
    CHECK (char_length("title") BETWEEN 4 AND 35);
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_description_length_check"
    CHECK ("description" IS NULL OR char_length("description") >= 10);
ALTER TABLE "IncidentLocation" ADD CONSTRAINT "IncidentLocation_coordinates_check"
    CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180
       AND ("accuracy" IS NULL OR "accuracy" >= 0));
ALTER TABLE "IncidentLocation" ALTER COLUMN "latitude" SET NOT NULL;
ALTER TABLE "IncidentLocation" ALTER COLUMN "longitude" SET NOT NULL;
ALTER TABLE "priority_changes" ADD CONSTRAINT "priority_changes_origin_check"
    CHECK (("is_manual" AND "user_id" IS NOT NULL)
       OR (NOT "is_manual" AND "user_id" IS NULL));

CREATE INDEX "status_changes_user_id_idx" ON "status_changes"("user_id");
CREATE INDEX "priority_changes_user_id_idx" ON "priority_changes"("user_id");

-- Las FK compuestas protegen la pertenencia; esta guarda el indicador de técnico.
CREATE FUNCTION comprobar_tecnico_asignable() RETURNS trigger AS $$
BEGIN
    IF NEW."technicianId" IS NOT NULL THEN
        PERFORM 1 FROM "TeamMember"
        WHERE "userId" = NEW."technicianId" AND "teamId" = NEW."teamId" AND "isTechnician"
        FOR SHARE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'El técnico no es miembro asignable del equipo';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER comprobar_tecnico_asignable_incident
    BEFORE INSERT OR UPDATE OF "technicianId", "teamId" ON "Incident"
    FOR EACH ROW EXECUTE FUNCTION comprobar_tecnico_asignable();

CREATE FUNCTION impedir_desactivar_tecnico_asignado() RETURNS trigger AS $$
BEGIN
    IF OLD."isTechnician" AND NOT NEW."isTechnician"
       AND EXISTS (SELECT 1 FROM "Incident" WHERE "technicianId" = OLD."userId" AND "teamId" = OLD."teamId") THEN
        RAISE EXCEPTION 'No se puede desactivar un técnico con incidencias asignadas';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER impedir_desactivar_tecnico_asignado_member
    BEFORE UPDATE OF "isTechnician" ON "TeamMember"
    FOR EACH ROW EXECUTE FUNCTION impedir_desactivar_tecnico_asignado();

COMMIT;
