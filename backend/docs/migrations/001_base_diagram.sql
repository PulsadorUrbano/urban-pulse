CREATE TYPE "incident_priority" AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE "incident_status" AS ENUM (
  'reported',
  'rejected',
  'validated',
  'assigned',
  'in_progress',
  'resolved',
  'reopened',
  'closed'
);

CREATE TYPE "address_district" AS ENUM (
  'centro',
  'este',
  'ciudad_jardin',
  'bailen_miraflores',
  'palma_palmilla',
  'cruz_del_humilladero',
  'carretera_de_cadiz',
  'churriana',
  'campanillas',
  'puerto_de_la_torre',
  'teatinos_universidad'
);

CREATE TYPE "profile_role" AS ENUM (
  'administrative',
  'department',
  'team',
  'technician',
  'civic',
  'admin',
  'analyst'
);

CREATE TABLE "users" (
  "id" uuid,
  "username" varchar UNIQUE,
  "email" varchar,
  "password" varchar,
  "created_at" timestamp DEFAULT 'now()',
  "role" profile_role,
  PRIMARY KEY ("id")
);

CREATE TABLE "civics" (
  "user_id" uuid PRIMARY KEY,
  "phone" varchar
);

CREATE TABLE "department_members" (
  "user_id" uuid PRIMARY KEY,
  "department_id" uuid NOT NULL
);

CREATE TABLE "team_members" (
  "user_id" uuid PRIMARY KEY,
  "team_id" uuid NOT NULL,
  "is_technician" boolean NOT NULL DEFAULT false
);

CREATE TABLE "incidents" (
  "id" uuid,
  "title" varchar NOT NULL,
  "description" varchar,
  "priority" incident_priority NOT NULL DEFAULT (low),
  "status" incident_status NOT NULL DEFAULT (reported),
  "created_at" timestamp DEFAULT (now()),
  "civic_id" uuid NOT NULL,
  "location_id" uuid NOT NULL,
  "urban_asset_id" uuid,
  "category_id" uuid NOT NULL,
  "department_id" uuid,
  "team_id" uuid,
  "technician_id" uuid,
  CONSTRAINT "title_length" CHECK (length(title) >= 4 AND length(title) <= 25),
  CONSTRAINT "description_reqs" CHECK (description IS NULL OR length(description) >= 10),
  PRIMARY KEY ("id")
);

CREATE TABLE "status_changes" (
  "id" uuid PRIMARY KEY,
  "incident_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "new_status" incident_status NOT NULL,
  "cause" varchar,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "urban_assets" (
  "id" uuid,
  "name" varchar UNIQUE,
  PRIMARY KEY ("id")
);

CREATE TABLE "incident_images" (
  "cloudinary_id" varchar,
  "incident_id" uuid NOT NULL,
  PRIMARY KEY ("cloudinary_id")
);

CREATE TABLE "categories" (
  "id" uuid,
  "name" varchar UNIQUE NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "priority_changes" (
  "id" uuid,
  "is_manual" boolean NOT NULL DEFAULT (true),
  "new_priority" incident_priority NOT NULL,
  "cause" varchar,
  "created_at" timestamp DEFAULT (now()),
  "incident_id" uuid NOT NULL,
  "user_id" uuid NOT NULL
);

CREATE TABLE "urban_contexts" (
  "id" uuid,
  "weather" varchar,
  "traffic" varchar,
  "mobility" varchar,
  "environment" varchar,
  "demography" int,
  "location_id" uuid UNIQUE NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "locations" (
  "id" uuid,
  "position" geography NOT NULL,
  "address_id" uuid,
  PRIMARY KEY ("id")
);

CREATE TABLE "addresses" (
  "id" uuid,
  "street" varchar NOT NULL,
  "zip_code" int NOT NULL,
  "disctrict" address_district NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "departments" (
  "id" uuid,
  "name" varchar UNIQUE NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "teams" (
  "id" uuid,
  "name" varchar NOT NULL,
  "department_id" uuid NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX ON "users" ("email");

CREATE INDEX ON "status_changes" ("incident_id");

CREATE INDEX ON "status_changes" ("created_at");

CREATE UNIQUE INDEX ON "locations" ("position");

ALTER TABLE "civics" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "department_members" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "department_members" ADD FOREIGN KEY ("department_id") REFERENCES "departments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "team_members" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "team_members" ADD FOREIGN KEY ("team_id") REFERENCES "teams" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "incidents" ADD FOREIGN KEY ("civic_id") REFERENCES "civics" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "incidents" ADD FOREIGN KEY ("location_id") REFERENCES "locations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "incidents" ADD FOREIGN KEY ("urban_asset_id") REFERENCES "urban_assets" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "incidents" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "incidents" ADD FOREIGN KEY ("department_id") REFERENCES "departments" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "incidents" ADD FOREIGN KEY ("team_id") REFERENCES "teams" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "incidents" ADD FOREIGN KEY ("technician_id") REFERENCES "team_members" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "status_changes" ADD FOREIGN KEY ("incident_id") REFERENCES "incidents" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "status_changes" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "incident_images" ADD FOREIGN KEY ("incident_id") REFERENCES "incidents" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "priority_changes" ADD FOREIGN KEY ("incident_id") REFERENCES "incidents" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "priority_changes" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "urban_contexts" ADD FOREIGN KEY ("location_id") REFERENCES "locations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "locations" ADD FOREIGN KEY ("address_id") REFERENCES "addresses" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "teams" ADD FOREIGN KEY ("department_id") REFERENCES "departments" ("id") DEFERRABLE INITIALLY IMMEDIATE;
