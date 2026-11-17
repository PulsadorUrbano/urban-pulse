-- Referencia declarativa generada desde Prisma; no usar como migración.
-- Los CHECK, triggers y datos de catálogo se definen en prisma/migrations/.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('reported', 'validated', 'rejected', 'assigned', 'in_progress', 'resolved', 'reopened', 'closed');

-- CreateEnum
CREATE TYPE "AddressDistrict" AS ENUM ('centro', 'este', 'ciudad_jardin', 'bailen_miraflores', 'palma_palmilla', 'cruz_del_humilladero', 'carretera_de_cadiz', 'churriana', 'campanillas', 'puerto_de_la_torre', 'teatinos_universidad');

-- CreateEnum
CREATE TYPE "IncidentPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "profile_role" AS ENUM ('administrative', 'department', 'team', 'technician', 'civic', 'admin', 'analyst');

-- CreateTable
CREATE TABLE "Incident" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "civicId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "urbanAssetId" UUID,
    "departmentId" UUID,
    "teamId" UUID,
    "technicianId" UUID,
    "status" "IncidentStatus" NOT NULL DEFAULT 'reported',
    "priority" "IncidentPriority" NOT NULL DEFAULT 'low',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
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

-- CreateTable
CREATE TABLE "Department" (
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" UUID NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "isTechnician" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("userId","teamId")
);

-- CreateTable
CREATE TABLE "IncidentLocation" (
    "incidentId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addressId" UUID,

    CONSTRAINT "IncidentLocation_pkey" PRIMARY KEY ("incidentId")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" UUID NOT NULL,
    "street" TEXT NOT NULL,
    "zipCode" VARCHAR(5) NOT NULL,
    "district" "AddressDistrict" NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "status_changes" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "new_status" "IncidentStatus" NOT NULL,
    "cause" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priority_changes" (
    "id" UUID NOT NULL,
    "is_manual" BOOLEAN NOT NULL,
    "new_priority" "IncidentPriority" NOT NULL,
    "cause" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incident_id" UUID NOT NULL,
    "user_id" UUID,

    CONSTRAINT "priority_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "profile_role" NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizens" (
    "user_id" UUID NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citizens_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "DepartmentMember" (
    "userId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,

    CONSTRAINT "DepartmentMember_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "assignment_changes" (
    "id" UUID NOT NULL,
    "incidenciaId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "departamentoAnteriorId" UUID,
    "equipoAnteriorId" UUID,
    "tecnicoAnteriorId" UUID,
    "departamentoNuevoId" UUID,
    "equipoNuevoId" UUID,
    "tecnicoNuevoId" UUID,
    "motivo" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_departmentId_idx" ON "Incident"("departmentId");

-- CreateIndex
CREATE INDEX "Incident_civicId_createdAt_id_idx" ON "Incident"("civicId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Incident_categoryId_idx" ON "Incident"("categoryId");

-- CreateIndex
CREATE INDEX "Incident_urbanAssetId_idx" ON "Incident"("urbanAssetId");

-- CreateIndex
CREATE INDEX "Incident_teamId_idx" ON "Incident"("teamId");

-- CreateIndex
CREATE INDEX "Incident_technicianId_teamId_idx" ON "Incident"("technicianId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_normalizedName_key" ON "Category"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "UrbanAsset_name_key" ON "UrbanAsset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Team_departmentId_idx" ON "Team"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_departmentId_name_key" ON "Team"("departmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_id_departmentId_key" ON "Team"("id", "departmentId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_userId_key" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "IncidentLocation_addressId_idx" ON "IncidentLocation"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_street_zipCode_district_key" ON "Address"("street", "zipCode", "district");

-- CreateIndex
CREATE UNIQUE INDEX "UrbanContext_locationId_key" ON "UrbanContext"("locationId");

-- CreateIndex
CREATE INDEX "status_changes_incident_id_idx" ON "status_changes"("incident_id");

-- CreateIndex
CREATE INDEX "status_changes_user_id_idx" ON "status_changes"("user_id");

-- CreateIndex
CREATE INDEX "status_changes_created_at_idx" ON "status_changes"("created_at");

-- CreateIndex
CREATE INDEX "priority_changes_incident_id_idx" ON "priority_changes"("incident_id");

-- CreateIndex
CREATE INDEX "priority_changes_user_id_idx" ON "priority_changes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "citizens_phone_key" ON "citizens"("phone");

-- CreateIndex
CREATE INDEX "DepartmentMember_departmentId_idx" ON "DepartmentMember"("departmentId");

-- CreateIndex
CREATE INDEX "assignment_changes_incidenciaId_fechaCreacion_id_idx" ON "assignment_changes"("incidenciaId", "fechaCreacion", "id");

-- CreateIndex
CREATE INDEX "assignment_changes_actorId_idx" ON "assignment_changes"("actorId");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_civicId_fkey" FOREIGN KEY ("civicId") REFERENCES "citizens"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_urbanAssetId_fkey" FOREIGN KEY ("urbanAssetId") REFERENCES "UrbanAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_teamId_departmentId_fkey" FOREIGN KEY ("teamId", "departmentId") REFERENCES "Team"("id", "departmentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_technicianId_teamId_fkey" FOREIGN KEY ("technicianId", "teamId") REFERENCES "TeamMember"("userId", "teamId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentLocation" ADD CONSTRAINT "IncidentLocation_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentLocation" ADD CONSTRAINT "IncidentLocation_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UrbanContext" ADD CONSTRAINT "UrbanContext_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "IncidentLocation"("incidentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_changes" ADD CONSTRAINT "status_changes_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_changes" ADD CONSTRAINT "status_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_changes" ADD CONSTRAINT "priority_changes_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_changes" ADD CONSTRAINT "priority_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizens" ADD CONSTRAINT "citizens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentMember" ADD CONSTRAINT "DepartmentMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_changes" ADD CONSTRAINT "assignment_changes_incidenciaId_fkey" FOREIGN KEY ("incidenciaId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_changes" ADD CONSTRAINT "assignment_changes_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_changes" ADD CONSTRAINT "assignment_changes_departamentoAnteriorId_fkey" FOREIGN KEY ("departamentoAnteriorId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assignment_changes" ADD CONSTRAINT "assignment_changes_equipoAnteriorId_fkey" FOREIGN KEY ("equipoAnteriorId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assignment_changes" ADD CONSTRAINT "assignment_changes_tecnicoAnteriorId_fkey" FOREIGN KEY ("tecnicoAnteriorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assignment_changes" ADD CONSTRAINT "assignment_changes_departamentoNuevoId_fkey" FOREIGN KEY ("departamentoNuevoId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assignment_changes" ADD CONSTRAINT "assignment_changes_equipoNuevoId_fkey" FOREIGN KEY ("equipoNuevoId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assignment_changes" ADD CONSTRAINT "assignment_changes_tecnicoNuevoId_fkey" FOREIGN KEY ("tecnicoNuevoId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
