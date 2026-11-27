-- CreateTable
CREATE TABLE "SeedIncident" (
    "incidentId" UUID NOT NULL,

    CONSTRAINT "SeedIncident_pkey" PRIMARY KEY ("incidentId")
);

-- AddForeignKey
ALTER TABLE "SeedIncident" ADD CONSTRAINT "SeedIncident_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

