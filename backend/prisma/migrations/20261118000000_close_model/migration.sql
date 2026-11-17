BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "Incident" WHERE "categoryId" IS NULL) THEN RAISE EXCEPTION 'Completar categorías antes de migrar'; END IF;
 IF EXISTS (SELECT 1 FROM "Incident" i WHERE NOT EXISTS (SELECT 1 FROM "IncidentLocation" l WHERE l."incidentId"=i.id)) THEN RAISE EXCEPTION 'Completar ubicaciones antes de migrar'; END IF;
 IF EXISTS (SELECT 1 FROM "TeamMember" GROUP BY "userId" HAVING count(*)>1) THEN RAISE EXCEPTION 'Resolver usuarios con varios equipos antes de migrar'; END IF;
END $$;
ALTER TABLE "Incident" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Incident" DROP COLUMN "category";
ALTER TABLE "Category" ADD COLUMN "code" TEXT, ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Category" SET "code"='legacy_' || replace(id::text,'-',''), "isActive"=false;
UPDATE "Category" SET "code"='alumbrado', "name"='Alumbrado público', "normalizedName"=lower('Alumbrado público'), "isActive"=true WHERE "normalizedName"=lower('Iluminación');
INSERT INTO "Category" (id,name,"normalizedName",code,"isActive") SELECT gen_random_uuid(),'Alumbrado público',lower('Alumbrado público'),'alumbrado',true WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE code='alumbrado');
UPDATE "Category" SET "code"='limpieza', "name"='Limpieza viaria', "normalizedName"=lower('Limpieza viaria'), "isActive"=true WHERE "normalizedName"=lower('Limpieza');
INSERT INTO "Category" (id,name,"normalizedName",code,"isActive") SELECT gen_random_uuid(),'Limpieza viaria',lower('Limpieza viaria'),'limpieza',true WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE code='limpieza');
UPDATE "Category" SET "code"='residuos', "name"='Residuos y recogida', "normalizedName"=lower('Residuos y recogida'), "isActive"=true WHERE "normalizedName"=lower('Residuos y recogida');
INSERT INTO "Category" (id,name,"normalizedName",code,"isActive") SELECT gen_random_uuid(),'Residuos y recogida',lower('Residuos y recogida'),'residuos',true WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE code='residuos');
UPDATE "Category" SET "code"='pavimentos', "name"='Aceras y calzadas', "normalizedName"=lower('Aceras y calzadas'), "isActive"=true WHERE "normalizedName"=lower('Vía pública');
INSERT INTO "Category" (id,name,"normalizedName",code,"isActive") SELECT gen_random_uuid(),'Aceras y calzadas',lower('Aceras y calzadas'),'pavimentos',true WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE code='pavimentos');
UPDATE "Category" SET "code"='accesibilidad', "name"='Accesibilidad', "normalizedName"=lower('Accesibilidad'), "isActive"=true WHERE "normalizedName"=lower('Accesibilidad');
INSERT INTO "Category" (id,name,"normalizedName",code,"isActive") SELECT gen_random_uuid(),'Accesibilidad',lower('Accesibilidad'),'accesibilidad',true WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE code='accesibilidad');
UPDATE "Category" SET "code"='senalizacion', "name"='Señalización y regulación del tráfico', "normalizedName"=lower('Señalización y regulación del tráfico'), "isActive"=true WHERE "normalizedName"=lower('Movilidad');
INSERT INTO "Category" (id,name,"normalizedName",code,"isActive") SELECT gen_random_uuid(),'Señalización y regulación del tráfico',lower('Señalización y regulación del tráfico'),'senalizacion',true WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE code='senalizacion');
UPDATE "Category" SET "code"='zonas_verdes', "name"='Parques y zonas verdes', "normalizedName"=lower('Parques y zonas verdes'), "isActive"=true WHERE "normalizedName"=lower('Zonas verdes');
INSERT INTO "Category" (id,name,"normalizedName",code,"isActive") SELECT gen_random_uuid(),'Parques y zonas verdes',lower('Parques y zonas verdes'),'zonas_verdes',true WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE code='zonas_verdes');
UPDATE "Category" SET "code"='mobiliario', "name"='Mobiliario urbano', "normalizedName"=lower('Mobiliario urbano'), "isActive"=true WHERE "normalizedName"=lower('Mobiliario urbano');
INSERT INTO "Category" (id,name,"normalizedName",code,"isActive") SELECT gen_random_uuid(),'Mobiliario urbano',lower('Mobiliario urbano'),'mobiliario',true WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE code='mobiliario');
UPDATE "Category" SET "code"='agua_saneamiento', "name"='Agua y saneamiento', "normalizedName"=lower('Agua y saneamiento'), "isActive"=true WHERE "normalizedName"=lower('Agua y saneamiento');
INSERT INTO "Category" (id,name,"normalizedName",code,"isActive") SELECT gen_random_uuid(),'Agua y saneamiento',lower('Agua y saneamiento'),'agua_saneamiento',true WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE code='agua_saneamiento');
UPDATE "Category" SET "code"='otros', "name"='Otras incidencias', "normalizedName"=lower('Otras incidencias'), "isActive"=true WHERE "normalizedName"=lower('Otras incidencias');
INSERT INTO "Category" (id,name,"normalizedName",code,"isActive") SELECT gen_random_uuid(),'Otras incidencias',lower('Otras incidencias'),'otros',true WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE code='otros');
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
