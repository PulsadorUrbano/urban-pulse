-- IncidentImage está vacía en la base local inspeccionada el 2026-11-01.
ALTER TABLE "IncidentImage" ADD COLUMN "cloudinary_id" TEXT NOT NULL;
CREATE UNIQUE INDEX "IncidentImage_cloudinary_id_key" ON "IncidentImage"("cloudinary_id");
