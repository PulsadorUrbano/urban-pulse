-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."IncidentPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "public"."IncidentStatus" AS ENUM ('reported', 'validated', 'rejected');

-- CreateEnum
CREATE TYPE "public"."profile_role" AS ENUM ('administrative', 'department', 'team', 'technician', 'civic', 'admin', 'analyst');

-- CreateTable
CREATE TABLE "public"."Incident" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "civicId" UUID NOT NULL,
    "categoryId" UUID,
    "category" TEXT,
    "urbanAssetId" UUID,
    "status" "public"."IncidentStatus" NOT NULL DEFAULT 'reported',
    "priority" "public"."IncidentPriority" NOT NULL DEFAULT 'low',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IncidentImage" (
    "id" UUID NOT NULL,
    "incidentId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IncidentLocation" (
    "incidentId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentLocation_pkey" PRIMARY KEY ("incidentId")
);

-- CreateTable
CREATE TABLE "public"."citizens" (
    "user_id" UUID NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citizens_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."priority_changes" (
    "id" UUID NOT NULL,
    "is_manual" BOOLEAN NOT NULL DEFAULT true,
    "new_priority" "public"."IncidentPriority" NOT NULL,
    "cause" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incident_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "priority_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."status_changes" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "new_status" "public"."IncidentStatus" NOT NULL,
    "cause" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "public"."profile_role" NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentImage_incidentId_idx" ON "public"."IncidentImage"("incidentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "citizens_phone_key" ON "public"."citizens"("phone" ASC);

-- CreateIndex
CREATE INDEX "priority_changes_incident_id_idx" ON "public"."priority_changes"("incident_id" ASC);

-- CreateIndex
CREATE INDEX "status_changes_created_at_idx" ON "public"."status_changes"("created_at" ASC);

-- CreateIndex
CREATE INDEX "status_changes_incident_id_idx" ON "public"."status_changes"("incident_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username" ASC);

-- AddForeignKey
ALTER TABLE "public"."IncidentImage" ADD CONSTRAINT "IncidentImage_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IncidentLocation" ADD CONSTRAINT "IncidentLocation_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "public"."Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."citizens" ADD CONSTRAINT "citizens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."priority_changes" ADD CONSTRAINT "priority_changes_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "public"."Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."status_changes" ADD CONSTRAINT "status_changes_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "public"."Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
