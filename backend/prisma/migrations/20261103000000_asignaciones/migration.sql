ALTER TYPE "IncidentStatus" ADD VALUE 'assigned';

CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

CREATE TABLE "Team" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" UUID NOT NULL,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Team_departmentId_idx" ON "Team"("departmentId");
CREATE UNIQUE INDEX "Team_departmentId_name_key" ON "Team"("departmentId", "name");
ALTER TABLE "Team" ADD CONSTRAINT "Team_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TeamMember" (
    "userId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "isTechnician" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("userId", "teamId")
);
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Incident" ADD COLUMN "departmentId" UUID;
ALTER TABLE "Incident" ADD COLUMN "teamId" UUID;
ALTER TABLE "Incident" ADD COLUMN "technicianId" UUID;
CREATE INDEX "Incident_departmentId_idx" ON "Incident"("departmentId");
CREATE INDEX "Incident_teamId_idx" ON "Incident"("teamId");
CREATE INDEX "Incident_technicianId_idx" ON "Incident"("technicianId");
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
