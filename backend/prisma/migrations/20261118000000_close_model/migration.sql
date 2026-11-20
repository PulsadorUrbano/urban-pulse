BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "Incident" i WHERE NOT EXISTS (SELECT 1 FROM "IncidentLocation" l WHERE l."incidentId"=i.id)) THEN RAISE EXCEPTION 'Completar ubicaciones antes de migrar'; END IF;
 IF EXISTS (SELECT 1 FROM "TeamMember" GROUP BY "userId" HAVING count(*)>1) THEN RAISE EXCEPTION 'Resolver usuarios con varios equipos antes de migrar'; END IF;
 IF EXISTS (SELECT 1 FROM "Incident" WHERE
   (status IN ('assigned','in_progress','resolved','closed') AND ("departmentId" IS NULL OR "teamId" IS NULL))
   OR (status IN ('in_progress','resolved') AND "technicianId" IS NULL)
 ) THEN RAISE EXCEPTION 'Corregir estados sin asignación completa antes de migrar'; END IF;
END $$;
ALTER TABLE "Incident" DROP COLUMN "category";
ALTER TABLE "Category" ADD COLUMN "code" TEXT, ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Category" SET "code"='legacy_' || replace(id::text,'-',''), "isActive"=false;
-- Renombrar un alias solo si el nombre canónico no existe ya. Así se conserva
-- su UUID cuando es posible y no choca con una categoría histórica homónima.
UPDATE "Category" c
SET "code" = v.code, "name" = v.name, "normalizedName" = lower(v.name), "isActive" = true
FROM (VALUES
 ('alumbrado', 'Alumbrado público', 'Iluminación'),
 ('limpieza', 'Limpieza viaria', 'Limpieza'),
 ('residuos', 'Residuos y recogida', 'Residuos y recogida'),
 ('pavimentos', 'Aceras y calzadas', 'Vía pública'),
 ('accesibilidad', 'Accesibilidad', 'Accesibilidad'),
 ('senalizacion', 'Señalización y regulación del tráfico', 'Movilidad'),
 ('zonas_verdes', 'Parques y zonas verdes', 'Zonas verdes'),
 ('mobiliario', 'Mobiliario urbano', 'Mobiliario urbano'),
 ('agua_saneamiento', 'Agua y saneamiento', 'Agua y saneamiento'),
 ('otros', 'Otras incidencias', 'Otras incidencias')
) AS v(code, name, old_name)
WHERE c."normalizedName" = lower(v.old_name)
  AND NOT EXISTS (
    SELECT 1 FROM "Category" existente
    WHERE existente."normalizedName" = lower(v.name) AND existente.id <> c.id
  );

-- Activar la categoría canónica ya presente o crearla si no existe.
INSERT INTO "Category" (id, name, "normalizedName", code, "isActive")
SELECT gen_random_uuid(), v.name, lower(v.name), v.code, true
FROM (VALUES
 ('alumbrado', 'Alumbrado público'),
 ('limpieza', 'Limpieza viaria'),
 ('residuos', 'Residuos y recogida'),
 ('pavimentos', 'Aceras y calzadas'),
 ('accesibilidad', 'Accesibilidad'),
 ('senalizacion', 'Señalización y regulación del tráfico'),
 ('zonas_verdes', 'Parques y zonas verdes'),
 ('mobiliario', 'Mobiliario urbano'),
 ('agua_saneamiento', 'Agua y saneamiento'),
 ('otros', 'Otras incidencias')
) AS v(code, name)
WHERE true
ON CONFLICT ("normalizedName") DO UPDATE
SET code = EXCLUDED.code, "name" = EXCLUDED.name, "isActive" = true;
ALTER TABLE "Category" ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX "Category_code_key" ON "Category"(code);
ALTER TABLE users ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Department" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Team" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TeamMember" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX "TeamMember_userId_key" ON "TeamMember"("userId");
CREATE TABLE "DepartmentMember" (
 "userId" UUID PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "departmentId" UUID NOT NULL REFERENCES "Department"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DepartmentMember_departmentId_idx" ON "DepartmentMember"("departmentId");
CREATE TABLE assignment_changes (
 id UUID PRIMARY KEY,
 "incidenciaId" UUID NOT NULL REFERENCES "Incident"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "actorId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "departamentoAnteriorId" UUID REFERENCES "Department"(id) ON DELETE RESTRICT,
 "equipoAnteriorId" UUID REFERENCES "Team"(id) ON DELETE RESTRICT,
 "tecnicoAnteriorId" UUID REFERENCES users(id) ON DELETE RESTRICT,
 "departamentoNuevoId" UUID REFERENCES "Department"(id) ON DELETE RESTRICT,
 "equipoNuevoId" UUID REFERENCES "Team"(id) ON DELETE RESTRICT,
 "tecnicoNuevoId" UUID REFERENCES users(id) ON DELETE RESTRICT,
 motivo TEXT NOT NULL CHECK (btrim(motivo)<>''),
 "fechaCreacion" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "assignment_changes_incidenciaId_fechaCreacion_id_idx" ON assignment_changes("incidenciaId","fechaCreacion",id);
CREATE INDEX "assignment_changes_actorId_idx" ON assignment_changes("actorId");
-- No se inventan actores ni fechas para asignaciones históricas. El historial comienza con esta migración.
CREATE FUNCTION validar_transicion_incidencia() RETURNS trigger AS $$ BEGIN
 IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NOT (
  (OLD.status='reported' AND NEW.status IN ('validated','rejected')) OR
  (OLD.status='validated' AND NEW.status='assigned') OR
  (OLD.status='assigned' AND NEW.status='in_progress') OR
  (OLD.status='in_progress' AND NEW.status='resolved') OR
  (OLD.status='resolved' AND NEW.status IN ('closed','reopened')) OR
  (OLD.status='closed' AND NEW.status='reopened') OR
  (OLD.status='reopened' AND NEW.status='assigned')
 ) THEN RAISE EXCEPTION 'Transición de estado no permitida'; END IF;
 IF NEW.status IN ('assigned','in_progress','resolved','closed') AND (NEW."departmentId" IS NULL OR NEW."teamId" IS NULL) THEN
  RAISE EXCEPTION 'El estado requiere departamento y equipo';
 END IF;
 IF NEW.status IN ('in_progress','resolved') AND NEW."technicianId" IS NULL THEN RAISE EXCEPTION 'El estado requiere técnico'; END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER validar_transicion BEFORE INSERT OR UPDATE ON "Incident" FOR EACH ROW EXECUTE FUNCTION validar_transicion_incidencia();
CREATE FUNCTION impedir_borrado_incidencia() RETURNS trigger AS $$ BEGIN
 RAISE EXCEPTION 'Las incidencias se conservan permanentemente';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER conservar_incidencias BEFORE DELETE ON "Incident" FOR EACH ROW EXECUTE FUNCTION impedir_borrado_incidencia();
CREATE TRIGGER conservar_incidencias_truncate BEFORE TRUNCATE ON "Incident" FOR EACH STATEMENT EXECUTE FUNCTION impedir_borrado_incidencia();
CREATE FUNCTION impedir_alterar_historial() RETURNS trigger AS $$ BEGIN
 RAISE EXCEPTION 'El historial es inmutable';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER conservar_asignaciones BEFORE UPDATE OR DELETE ON assignment_changes FOR EACH ROW EXECUTE FUNCTION impedir_alterar_historial();
CREATE TRIGGER conservar_estados BEFORE UPDATE OR DELETE ON status_changes FOR EACH ROW EXECUTE FUNCTION impedir_alterar_historial();
CREATE TRIGGER conservar_prioridades BEFORE UPDATE OR DELETE ON priority_changes FOR EACH ROW EXECUTE FUNCTION impedir_alterar_historial();
-- La relación uno a uno se valida al commit para permitir el alta anidada de Prisma.
CREATE FUNCTION exigir_ubicacion_incidencia() RETURNS trigger AS $$
DECLARE identificador UUID;
BEGIN
 IF TG_TABLE_NAME='Incident' THEN identificador=NEW.id; ELSE identificador=OLD."incidentId"; END IF;
 IF EXISTS (SELECT 1 FROM "Incident" WHERE id=identificador) AND NOT EXISTS (SELECT 1 FROM "IncidentLocation" WHERE "incidentId"=identificador) THEN
  RAISE EXCEPTION 'Toda incidencia requiere ubicación';
 END IF;
 RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER incidencia_con_ubicacion AFTER INSERT OR UPDATE ON "Incident" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION exigir_ubicacion_incidencia();
CREATE CONSTRAINT TRIGGER conservar_ubicacion AFTER DELETE OR UPDATE ON "IncidentLocation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION exigir_ubicacion_incidencia();
CREATE TRIGGER conservar_assignment_changes_truncate BEFORE TRUNCATE ON assignment_changes FOR EACH STATEMENT EXECUTE FUNCTION impedir_alterar_historial();
CREATE TRIGGER conservar_status_changes_truncate BEFORE TRUNCATE ON status_changes FOR EACH STATEMENT EXECUTE FUNCTION impedir_alterar_historial();
CREATE TRIGGER conservar_priority_changes_truncate BEFORE TRUNCATE ON priority_changes FOR EACH STATEMENT EXECUTE FUNCTION impedir_alterar_historial();
ALTER TABLE "UrbanContext" ADD CONSTRAINT contexto_demografia_check CHECK (demography IS NULL OR demography>=0);
INSERT INTO "UrbanAsset" (id,name) VALUES
(gen_random_uuid(),'Farola'),
(gen_random_uuid(),'Contenedor'),
(gen_random_uuid(),'Papelera'),
(gen_random_uuid(),'Banco'),
(gen_random_uuid(),'Semáforo'),
(gen_random_uuid(),'Señal'),
(gen_random_uuid(),'Acera'),
(gen_random_uuid(),'Calzada'),
(gen_random_uuid(),'Árbol'),
(gen_random_uuid(),'Zona ajardinada'),
(gen_random_uuid(),'Fuente'),
(gen_random_uuid(),'Alcantarilla'),
(gen_random_uuid(),'Imbornal'),
(gen_random_uuid(),'Rampa'),
(gen_random_uuid(),'Juego infantil')
ON CONFLICT (name) DO NOTHING;
COMMIT;
