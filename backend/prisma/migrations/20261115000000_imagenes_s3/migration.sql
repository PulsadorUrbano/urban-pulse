CREATE TABLE "IncidentImage" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncidentImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IncidentImage_objectKey_key" ON "IncidentImage"("objectKey");
CREATE INDEX "IncidentImage_incidentId_idx" ON "IncidentImage"("incidentId");
ALTER TABLE "IncidentImage" ADD CONSTRAINT "IncidentImage_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
