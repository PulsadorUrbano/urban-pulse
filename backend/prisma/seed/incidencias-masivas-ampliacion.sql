-- Ampliación del seed masivo: 45.000 incidencias más sobre los actores del primer seed.
-- Documentación: backend/docs/spec/features/24-11-26-fotos-y-ampliacion-seed/spec.md
--
-- Requiere haber aplicado antes prisma/seed/incidencias-masivas.sql (5000 incidencias).
-- IRREVERSIBLE: las incidencias y los historiales no se pueden borrar (triggers de
-- 20261118000000_close_model). En local se deshace recreando el volumen de la BD.
-- Ejecutar con: pnpm seed:incidencias:ampliacion (lee DATABASE_URL desde prisma7.config.ts).
-- Todo el script es una única transacción: si una comprobación falla no queda nada.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Guardas
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = '5eed0000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Falta el primer seed: ejecutar antes pnpm seed:incidencias';
  END IF;
  -- Fila marcadora propia de la ampliación.
  IF EXISTS (SELECT 1 FROM users WHERE id = '5eed0000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'Ampliación del seed ya aplicada';
  END IF;
  -- El primer seed registra sus 5000 incidencias en "SeedIncident". Si no están, se
  -- aplicó una versión anterior a ese registro: hay que recrear la BD.
  IF (SELECT count(*) FROM "SeedIncident") <> 5000 THEN
    RAISE EXCEPTION 'El primer seed no tiene sus 5000 incidencias en "SeedIncident": recrear la BD (docker compose down -v) y ejecutar el seed actual';
  END IF;
END $$;

-- Generación reproducible, distinta de la del primer seed (no afecta a gen_random_uuid).
SELECT setseed(0.4242);

-- Hash bcrypt (coste 10) de seed1234: identifica a todas las cuentas del seed.
CREATE TEMP TABLE seed_hash ON COMMIT DROP AS
SELECT '$2a$10$.luy7bguVO4N2UOgWJ9hN.GjocHQY3gG/7zUHldbyZo41cBz2Hl5i'::text AS hash;

-- ---------------------------------------------------------------------------
-- 2. Usuarios nuevos: marcador administrativo y 300 ciudadanos más
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE seed_candidatos ON COMMIT DROP AS
WITH listas AS (
  SELECT
    ARRAY['lucia', 'maria', 'carmen', 'ana', 'laura', 'paula', 'elena', 'marta',
          'sara', 'irene', 'julia', 'alba', 'nerea', 'claudia', 'rocio', 'cristina',
          'raquel', 'sofia', 'andrea', 'noelia', 'javier', 'alvaro', 'pablo', 'daniel',
          'carlos', 'sergio', 'david', 'alejandro', 'manuel', 'antonio', 'jose',
          'francisco', 'miguel', 'adrian', 'hugo', 'mario', 'ivan', 'ruben', 'diego',
          'jorge'] AS nombres,
    ARRAY['garcia', 'martinez', 'lopez', 'sanchez', 'romero', 'moreno', 'ruiz',
          'navarro', 'jimenez', 'torres', 'dominguez', 'vazquez', 'castillo', 'ortega',
          'molina', 'delgado', 'TheBest', 'Full', 'Pro', 'Sur', 'Malaga', 'Costa',
          'Sol', 'Dev', 'Runner'] AS sufijos,
    ARRAY['2', '3', '7', '10', '11', '13', '21', '22', '23', '34', '49', '77', '88',
          '90', '99', '1985', '1990', '1995', '1998', '2001', '2003', '2005'] AS numeros,
    ARRAY['gmail.com', 'hotmail.com', 'outlook.es', 'yahoo.es'] AS dominios
), partes AS (
  SELECT
    g,
    l.nombres[1 + floor(random() * array_length(l.nombres, 1))::int] AS nombre,
    CASE WHEN random() < 0.6
      THEN l.sufijos[1 + floor(random() * array_length(l.sufijos, 1))::int] END AS sufijo,
    CASE WHEN random() < 0.5
      THEN l.numeros[1 + floor(random() * array_length(l.numeros, 1))::int] END AS numero,
    (ARRAY['', '_', '.'])[1 + floor(random() * 3)::int] AS separador,
    l.dominios[1 + floor(random() * array_length(l.dominios, 1))::int] AS dominio
  FROM generate_series(1, 3000) AS g CROSS JOIN listas AS l
)
SELECT
  g,
  nombre
    -- Los sufijos en mayúscula se pegan sin separador (carmenTheBest).
    || CASE WHEN sufijo IS NULL THEN ''
            WHEN sufijo ~ '^[A-Z]' THEN sufijo
            ELSE separador || sufijo END
    || coalesce(numero, '') AS username,
  dominio
FROM partes;

-- Usuarios únicos (sin distinguir mayúsculas) que no chocan con los existentes.
CREATE TEMP TABLE seed_usuarios_nuevos ON COMMIT DROP AS
WITH unicos AS (
  SELECT DISTINCT ON (lower(username)) g, username, dominio
  FROM seed_candidatos
  ORDER BY lower(username), g
), libres AS (
  SELECT u.*, row_number() OVER (ORDER BY u.g) AS n
  FROM unicos u
  WHERE NOT EXISTS (
    SELECT 1 FROM users e
    WHERE lower(e.username) = lower(u.username)
       OR lower(e.email) = lower(u.username) || '@' || u.dominio
  )
)
SELECT
  n,
  CASE WHEN n = 1 THEN '5eed0000-0000-4000-8000-000000000002'::uuid
       ELSE gen_random_uuid() END AS id,
  username,
  lower(username) || '@' || dominio AS email,
  (CASE WHEN n = 1 THEN 'administrative' ELSE 'civic' END)::profile_role AS role
FROM libres
WHERE n <= 301;

DO $$ BEGIN
  IF (SELECT count(*) FROM seed_usuarios_nuevos) <> 301 THEN
    RAISE EXCEPTION 'No se generaron suficientes nombres de usuario únicos';
  END IF;
END $$;

INSERT INTO users (id, username, email, password, role, created_at)
SELECT u.id, u.username, u.email, h.hash, u.role,
       now() - interval '400 days' + random() * interval '30 days'
FROM seed_usuarios_nuevos u CROSS JOIN seed_hash h;

INSERT INTO citizens (user_id, created_at)
SELECT u.id, us.created_at
FROM seed_usuarios_nuevos u JOIN users us ON us.id = u.id
WHERE u.role = 'civic';

-- ---------------------------------------------------------------------------
-- 3. Actores existentes del seed (departamentos, equipos, técnicos y ciudadanos)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE seed_departamentos ON COMMIT DROP AS
SELECT v.d, dep.id, v.name, v.categorias, dm."userId" AS user_id
FROM (VALUES
  (1, 'Alumbrado Público', ARRAY['alumbrado']),
  (2, 'Limpieza y Residuos', ARRAY['limpieza', 'residuos']),
  (3, 'Vía Pública', ARRAY['pavimentos', 'accesibilidad', 'mobiliario', 'otros']),
  (4, 'Parques y Jardines', ARRAY['zonas_verdes']),
  (5, 'Aguas y Saneamiento', ARRAY['agua_saneamiento']),
  (6, 'Movilidad', ARRAY['senalizacion'])
) AS v(d, name, categorias)
JOIN "Department" dep ON dep.name = v.name
JOIN LATERAL (
  SELECT m."userId" FROM "DepartmentMember" m
  JOIN users u ON u.id = m."userId"
  WHERE m."departmentId" = dep.id AND u.password = (SELECT hash FROM seed_hash)
  ORDER BY u.created_at LIMIT 1
) dm ON true;

CREATE TEMP TABLE seed_equipos ON COMMIT DROP AS
SELECT (d.d - 1) * 2 + o.orden AS t, d.d, o.orden, eq.id, o.name, d.id AS department_id
FROM seed_departamentos d
CROSS JOIN (VALUES (1, 'Equipo Norte'), (2, 'Equipo Sur')) AS o(orden, name)
JOIN "Team" eq ON eq."departmentId" = d.id AND eq.name = o.name;

CREATE TEMP TABLE seed_tecnicos ON COMMIT DROP AS
SELECT e.t, row_number() OVER (PARTITION BY e.t ORDER BY tm."userId") AS orden,
       tm."userId" AS user_id
FROM seed_equipos e
JOIN "TeamMember" tm ON tm."teamId" = e.id AND tm."isTechnician";

CREATE TEMP TABLE seed_admins ON COMMIT DROP AS
SELECT row_number() OVER (ORDER BY u.id) AS n, u.id
FROM users u
WHERE u.role = 'administrative' AND u.password = (SELECT hash FROM seed_hash);

CREATE TEMP TABLE seed_ciudadanos ON COMMIT DROP AS
SELECT row_number() OVER (ORDER BY u.id) AS n, u.id
FROM users u
WHERE u.role = 'civic' AND u.password = (SELECT hash FROM seed_hash);

DO $$ BEGIN
  IF (SELECT count(*) FROM seed_departamentos) <> 6
     OR (SELECT count(*) FROM seed_equipos) <> 12
     OR (SELECT count(*) FROM seed_tecnicos) <> 36
     OR EXISTS (SELECT 1 FROM seed_tecnicos GROUP BY t HAVING count(*) <> 3) THEN
    RAISE EXCEPTION 'La estructura municipal del primer seed no está completa';
  END IF;
  IF (SELECT count(*) FROM seed_ciudadanos) < 500 OR (SELECT count(*) FROM seed_admins) < 3 THEN
    RAISE EXCEPTION 'No se encontraron los ciudadanos y administrativos del seed';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Direcciones de Málaga (las mismas del primer seed)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE seed_calles ON COMMIT DROP AS
SELECT row_number() OVER () AS k, *
FROM (VALUES
  ('centro'::"AddressDistrict", 'Calle Larios', '29005', 36.7196, -4.4216),
  ('centro', 'Calle Granada', '29015', 36.7216, -4.4192),
  ('centro', 'Alameda Principal', '29005', 36.7177, -4.4229),
  ('centro', 'Calle Carretería', '29008', 36.7236, -4.4241),
  ('centro', 'Plaza de la Merced', '29012', 36.7240, -4.4170),
  ('este', 'Paseo Marítimo El Pedregal', '29018', 36.7197, -4.3720),
  ('este', 'Avenida Juan Sebastián Elcano', '29017', 36.7213, -4.3870),
  ('este', 'Calle Bolivia', '29017', 36.7205, -4.3960),
  ('este', 'Paseo de Sancha', '29016', 36.7190, -4.4060),
  ('ciudad_jardin', 'Avenida Jacinto Benavente', '29014', 36.7425, -4.4165),
  ('ciudad_jardin', 'Calle Lope de Rueda', '29014', 36.7440, -4.4190),
  ('ciudad_jardin', 'Calle Hacienda de Cabello', '29014', 36.7465, -4.4150),
  ('ciudad_jardin', 'Avenida Ciudad Jardín', '29014', 36.7405, -4.4200),
  ('bailen_miraflores', 'Calle Eugenio Gross', '29009', 36.7320, -4.4335),
  ('bailen_miraflores', 'Avenida de Barcelona', '29009', 36.7300, -4.4300),
  ('bailen_miraflores', 'Calle Cruz Verde', '29013', 36.7290, -4.4250),
  ('bailen_miraflores', 'Calle Martínez Maldonado', '29007', 36.7275, -4.4350),
  ('palma_palmilla', 'Calle Doctor Gálvez Moll', '29011', 36.7440, -4.4365),
  ('palma_palmilla', 'Avenida de la Palmilla', '29011', 36.7455, -4.4340),
  ('palma_palmilla', 'Calle Virgen de la Esperanza', '29011', 36.7470, -4.4380),
  ('palma_palmilla', 'Calle Jerónimo Cuervo', '29011', 36.7425, -4.4390),
  ('cruz_del_humilladero', 'Avenida de Andalucía', '29006', 36.7155, -4.4400),
  ('cruz_del_humilladero', 'Calle La Unión', '29006', 36.7150, -4.4480),
  ('cruz_del_humilladero', 'Avenida Ortega y Gasset', '29006', 36.7175, -4.4600),
  ('cruz_del_humilladero', 'Calle Conde de Guadalhorce', '29006', 36.7125, -4.4520),
  ('carretera_de_cadiz', 'Calle Héroe de Sostoa', '29002', 36.7070, -4.4400),
  ('carretera_de_cadiz', 'Paseo Antonio Banderas', '29004', 36.6930, -4.4450),
  ('carretera_de_cadiz', 'Avenida Velázquez', '29003', 36.7000, -4.4600),
  ('carretera_de_cadiz', 'Calle Pacífico', '29004', 36.6960, -4.4520),
  ('churriana', 'Calle Torremolinos', '29140', 36.6660, -4.5010),
  ('churriana', 'Carretera de Coín', '29140', 36.6640, -4.5060),
  ('churriana', 'Calle Maestro Vert', '29140', 36.6675, -4.4980),
  ('campanillas', 'Calle José Calderón', '29590', 36.7290, -4.5410),
  ('campanillas', 'Avenida de Campanillas', '29590', 36.7310, -4.5380),
  ('campanillas', 'Calle Pilar del Prado', '29590', 36.7275, -4.5440),
  ('puerto_de_la_torre', 'Calle Lope de Rueda', '29190', 36.7450, -4.4950),
  ('puerto_de_la_torre', 'Avenida Lope de Vega', '29190', 36.7465, -4.4920),
  ('puerto_de_la_torre', 'Calle Almogía', '29190', 36.7435, -4.4985),
  ('teatinos_universidad', 'Bulevar Louis Pasteur', '29010', 36.7200, -4.4700),
  ('teatinos_universidad', 'Calle Navarro Ledesma', '29010', 36.7255, -4.4705),
  ('teatinos_universidad', 'Avenida Plutarco', '29010', 36.7230, -4.4650),
  ('teatinos_universidad', 'Calle Hermanos Lumière', '29010', 36.7275, -4.4740)
) AS v(district, street, zip, lat, lon);

INSERT INTO "Address" (id, street, "zipCode", district)
SELECT gen_random_uuid(), street, zip, district FROM seed_calles
ON CONFLICT (street, "zipCode", district) DO NOTHING;

CREATE TEMP TABLE seed_direcciones ON COMMIT DROP AS
SELECT c.k, c.lat, c.lon, a.id AS address_id
FROM seed_calles c
JOIN "Address" a ON a.street = c.street AND a."zipCode" = c.zip AND a.district = c.district;

-- ---------------------------------------------------------------------------
-- 5. Plantillas de incidencia por categoría (título <= 35 caracteres)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE seed_plantillas ON COMMIT DROP AS
SELECT row_number() OVER () AS p, *
FROM (VALUES
  ('alumbrado', 'Farola', 'Farola apagada', 'La farola no se enciende al anochecer.'),
  ('alumbrado', 'Farola', 'Farola parpadeando', 'La luz se enciende y se apaga continuamente.'),
  ('alumbrado', 'Farola', 'Farola con el poste dañado', 'El poste está golpeado e inclinado.'),
  ('alumbrado', NULL, 'Calle sin iluminación', 'Todo el tramo de la calle está a oscuras.'),
  ('limpieza', NULL, 'Acera con suciedad acumulada', 'Hay suciedad acumulada desde hace tiempo.'),
  ('limpieza', NULL, 'Restos de botellón en la plaza', 'Vidrios y bolsas tirados tras el fin de semana.'),
  ('limpieza', 'Papelera', 'Papelera desbordada', 'La papelera está llena y la basura cae al suelo.'),
  ('limpieza', NULL, 'Pintadas en fachada pública', 'Han aparecido pintadas en un edificio municipal.'),
  ('residuos', 'Contenedor', 'Contenedor desbordado', 'Hay bolsas de basura alrededor del contenedor.'),
  ('residuos', 'Contenedor', 'Contenedor quemado', 'El contenedor está calcinado y desprende olor.'),
  ('residuos', 'Contenedor', 'Contenedor con la tapa rota', 'La tapa no cierra y entran animales.'),
  ('residuos', NULL, 'Enseres abandonados en la calle', 'Hay muebles viejos abandonados junto a la acera.'),
  ('pavimentos', 'Acera', 'Baldosas levantadas en la acera', 'Varias baldosas sueltas provocan tropiezos.'),
  ('pavimentos', 'Calzada', 'Bache en la calzada', 'Bache profundo en el carril derecho.'),
  ('pavimentos', 'Calzada', 'Hundimiento en el asfalto', 'El asfalto se ha hundido junto a una arqueta.'),
  ('pavimentos', 'Acera', 'Bordillo roto', 'El bordillo está partido y suelto.'),
  ('accesibilidad', 'Rampa', 'Rampa de acceso deteriorada', 'La rampa tiene grietas y el pasamanos suelto.'),
  ('accesibilidad', 'Acera', 'Paso de peatones sin rebaje', 'El paso no tiene rebaje para sillas de ruedas.'),
  ('accesibilidad', 'Acera', 'Obstáculo en itinerario accesible', 'Un elemento impide el paso por la acera.'),
  ('senalizacion', 'Semáforo', 'Semáforo no funciona', 'El semáforo está apagado en todas sus fases.'),
  ('senalizacion', 'Semáforo', 'Semáforo peatonal sin sonido', 'El aviso acústico para invidentes no suena.'),
  ('senalizacion', 'Señal', 'Señal de tráfico caída', 'La señal está en el suelo tras un golpe.'),
  ('senalizacion', 'Señal', 'Señal tapada por vegetación', 'Las ramas impiden ver la señal.'),
  ('senalizacion', NULL, 'Paso de cebra borrado', 'La pintura del paso de peatones apenas se ve.'),
  ('zonas_verdes', 'Árbol', 'Rama a punto de caer', 'Una rama grande cuelga sobre la acera.'),
  ('zonas_verdes', 'Árbol', 'Árbol caído', 'Un árbol ha caído tras el viento de anoche.'),
  ('zonas_verdes', 'Zona ajardinada', 'Riego averiado en jardín', 'Un aspersor pierde agua de forma continua.'),
  ('zonas_verdes', 'Zona ajardinada', 'Césped sin mantenimiento', 'La hierba está muy alta y seca.'),
  ('zonas_verdes', 'Juego infantil', 'Columpio roto en el parque', 'Una cadena del columpio está rota.'),
  ('mobiliario', 'Banco', 'Banco roto', 'El banco tiene el respaldo partido.'),
  ('mobiliario', 'Banco', 'Banco sin tablas', 'Faltan varias tablas del asiento.'),
  ('mobiliario', 'Papelera', 'Papelera arrancada', 'La papelera ha sido arrancada de su soporte.'),
  ('mobiliario', 'Fuente', 'Fuente sin agua', 'La fuente de agua potable no funciona.'),
  ('agua_saneamiento', 'Alcantarilla', 'Alcantarilla atascada', 'El agua no drena y sale mal olor.'),
  ('agua_saneamiento', 'Alcantarilla', 'Tapa de alcantarilla suelta', 'La tapa se mueve al pasar los coches.'),
  ('agua_saneamiento', 'Imbornal', 'Imbornal obstruido', 'El imbornal está tapado por hojas y barro.'),
  ('agua_saneamiento', NULL, 'Fuga de agua en la vía pública', 'Sale agua del suelo de forma constante.'),
  ('agua_saneamiento', 'Fuente', 'Fuente pierde agua', 'La fuente gotea sin parar.'),
  ('otros', NULL, 'Animal muerto en la vía', 'Hay un animal muerto en la calzada.'),
  ('otros', NULL, 'Ruido nocturno de obras', 'Se trabaja de noche fuera del horario permitido.'),
  ('otros', NULL, 'Plaga de cucarachas en la plaza', 'Se ven muchas cucarachas al anochecer.'),
  -- Plantillas nuevas de la ampliación.
  ('senalizacion', 'Semáforo', 'Atasco por semáforo averiado', 'El semáforo averiado está provocando retenciones.'),
  ('senalizacion', NULL, 'Atasco diario en el cruce', 'Se forman colas largas cada día en hora punta.'),
  ('otros', NULL, 'Vía de metro dañada', 'Se ve un carril de la vía partido o desplazado.')
) AS v(code, asset, title, description);

-- ---------------------------------------------------------------------------
-- 6. Incidencias: valores aleatorios y resolución de referencias
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE seed_base ON COMMIT DROP AS
SELECT g, gen_random_uuid() AS id,
       random() AS r_plantilla, random() AS r_direccion, random() AS r_ciudadano,
       random() AS r_estado, random() AS r_prioridad, random() AS r_equipo,
       random() AS r_tecnico, random() AS r_con_tecnico, random() AS r_fecha,
       random() AS r_duracion, random() AS r_lat, random() AS r_lon,
       random() AS r_precision, random() AS r_admin, random() AS r_descripcion
FROM generate_series(1, 45000) AS g;

CREATE TEMP TABLE seed_incidencias ON COMMIT DROP AS
WITH resueltas AS (
  SELECT
    b.*,
    pl.title, pl.description, pl.code,
    cat.id AS category_id,
    ua.id AS asset_id,
    civ.id AS civic_id,
    adm.id AS admin_id,
    dir.lat, dir.lon, dir.address_id,
    (CASE
      WHEN b.r_estado < 0.25 THEN 'reported'
      WHEN b.r_estado < 0.40 THEN 'validated'
      WHEN b.r_estado < 0.48 THEN 'rejected'
      WHEN b.r_estado < 0.63 THEN 'assigned'
      WHEN b.r_estado < 0.75 THEN 'in_progress'
      WHEN b.r_estado < 0.87 THEN 'resolved'
      WHEN b.r_estado < 0.97 THEN 'closed'
      ELSE 'reopened'
    END)::"IncidentStatus" AS status,
    (CASE
      WHEN b.r_prioridad < 0.50 THEN 'low'
      WHEN b.r_prioridad < 0.85 THEN 'medium'
      ELSE 'high'
    END)::"IncidentPriority" AS priority,
    dep.id AS dep_id,
    dep_user.user_id AS dep_user_id,
    eq.id AS team_id,
    tec.user_id AS tech_id
  FROM seed_base b
  JOIN seed_plantillas pl
    ON pl.p = 1 + floor(b.r_plantilla * (SELECT count(*) FROM seed_plantillas))::int
  JOIN "Category" cat ON cat.code = pl.code
  LEFT JOIN "UrbanAsset" ua ON ua.name = pl.asset
  JOIN seed_ciudadanos civ
    ON civ.n = 1 + floor(b.r_ciudadano * (SELECT count(*) FROM seed_ciudadanos))::int
  JOIN seed_admins adm
    ON adm.n = 1 + floor(b.r_admin * (SELECT count(*) FROM seed_admins))::int
  JOIN seed_direcciones dir
    ON dir.k = 1 + floor(b.r_direccion * (SELECT count(*) FROM seed_direcciones))::int
  JOIN seed_departamentos dep ON pl.code = ANY (dep.categorias)
  JOIN seed_departamentos dep_user ON dep_user.d = dep.d
  JOIN seed_equipos eq ON eq.d = dep.d AND eq.orden = 1 + floor(b.r_equipo * 2)::int
  JOIN seed_tecnicos tec ON tec.t = eq.t AND tec.orden = 1 + floor(b.r_tecnico * 3)::int
), con_camino AS (
  SELECT
    r.*,
    (CASE r.status
      WHEN 'reported' THEN ARRAY['reported']
      WHEN 'validated' THEN ARRAY['reported', 'validated']
      WHEN 'rejected' THEN ARRAY['reported', 'rejected']
      WHEN 'assigned' THEN ARRAY['reported', 'validated', 'assigned']
      WHEN 'in_progress' THEN ARRAY['reported', 'validated', 'assigned', 'in_progress']
      WHEN 'resolved' THEN ARRAY['reported', 'validated', 'assigned', 'in_progress', 'resolved']
      WHEN 'closed' THEN ARRAY['reported', 'validated', 'assigned', 'in_progress', 'resolved', 'closed']
      ELSE ARRAY['reported', 'validated', 'assigned', 'in_progress', 'resolved', 'reopened']
    END)::"IncidentStatus"[] AS camino,
    r.status IN ('assigned', 'in_progress', 'resolved', 'closed', 'reopened') AS asignada,
    -- Las pendientes son recientes; el resto se reparte en el último año.
    now() - (CASE WHEN r.status IN ('reported', 'validated')
                  THEN 0.5 + r.r_fecha * 60
                  ELSE 5 + r.r_fecha * 360 END) * interval '1 day' AS creada
  FROM resueltas r
)
SELECT
  c.g, c.id, c.title, c.category_id, c.asset_id, c.civic_id, c.admin_id,
  c.dep_user_id, c.status, c.priority, c.camino, c.creada,
  CASE WHEN c.r_descripcion < 0.1 THEN NULL
       ELSE c.description || (ARRAY['', ' Lleva así varios días.',
                                    ' Es peligroso para los peatones.',
                                    ' Afecta a los vecinos de la zona.',
                                    ' Se nota sobre todo por la noche.'])
                             [1 + floor(c.r_descripcion * 5)::int]
  END AS description,
  CASE WHEN c.asignada THEN c.dep_id END AS dep_id,
  CASE WHEN c.asignada THEN c.team_id END AS team_id,
  CASE WHEN c.asignada AND (c.status <> 'assigned' OR c.r_con_tecnico < 0.7)
       THEN c.tech_id END AS tech_id,
  -- Duración entre el alta y el último cambio de estado.
  (now() - c.creada) * (0.1 + 0.8 * c.r_duracion) AS duracion,
  c.lat + (c.r_lat * 2 - 1) * 0.0072 AS latitude,
  c.lon + (c.r_lon * 2 - 1) * 0.009 AS longitude,
  round((5 + c.r_precision * 25)::numeric, 1)::double precision AS accuracy,
  c.address_id
FROM con_camino c;

DO $$ BEGIN
  IF (SELECT count(*) FROM seed_incidencias) <> 45000 THEN
    RAISE EXCEPTION 'No se resolvieron todas las incidencias generadas';
  END IF;
END $$;

-- Incident.createdAt es timestamp sin zona: se guarda en UTC como hace Prisma.
INSERT INTO "Incident" (id, title, description, "civicId", "categoryId", "urbanAssetId",
                        "departmentId", "teamId", "technicianId", status, priority, "createdAt")
SELECT id, title, description, civic_id, category_id, asset_id,
       dep_id, team_id, tech_id, status, priority, creada AT TIME ZONE 'UTC'
FROM seed_incidencias;

INSERT INTO "IncidentLocation" ("incidentId", latitude, longitude, accuracy, "createdAt", "addressId")
SELECT id, latitude, longitude, accuracy, creada AT TIME ZONE 'UTC', address_id
FROM seed_incidencias;

-- Registro estable de las incidencias del seed (lo usa prisma/seed/fotos-incidencias.mjs).
INSERT INTO "SeedIncident" ("incidentId")
SELECT id FROM seed_incidencias;

-- ---------------------------------------------------------------------------
-- 7. Historial coherente con el estado final
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE seed_pasos ON COMMIT DROP AS
SELECT
  i.id AS incident_id, s.estado, s.ord,
  i.creada + i.duracion * (s.ord - 1) / greatest(array_length(i.camino, 1) - 1, 1) AS fecha,
  CASE
    WHEN s.estado = 'reported' THEN i.civic_id
    WHEN s.estado IN ('validated', 'rejected') THEN i.admin_id
    WHEN s.estado IN ('in_progress', 'resolved') THEN i.tech_id
    ELSE i.dep_user_id
  END AS actor_id,
  i.dep_id, i.team_id, i.tech_id
FROM seed_incidencias i
CROSS JOIN LATERAL unnest(i.camino) WITH ORDINALITY AS s(estado, ord);

INSERT INTO status_changes (id, incident_id, user_id, new_status, cause, created_at)
SELECT
  gen_random_uuid(), incident_id, actor_id, estado,
  CASE estado
    WHEN 'reported' THEN 'Registro de incidencia'
    WHEN 'validated' THEN (ARRAY['Incidencia verificada', 'Validada tras revisión',
                                 'Confirmada por el servicio municipal'])[1 + floor(random() * 3)::int]
    WHEN 'rejected' THEN (ARRAY['Incidencia duplicada', 'No corresponde al ámbito municipal',
                                'Información insuficiente para actuar'])[1 + floor(random() * 3)::int]
    WHEN 'assigned' THEN 'Asignación de incidencia'
    WHEN 'in_progress' THEN (ARRAY['Equipo desplazado al lugar', 'Inicio de los trabajos'])[1 + floor(random() * 2)::int]
    WHEN 'resolved' THEN (ARRAY['Reparación completada', 'Trabajos finalizados'])[1 + floor(random() * 2)::int]
    WHEN 'closed' THEN (ARRAY['Cierre tras comprobación', 'Resolución verificada'])[1 + floor(random() * 2)::int]
    ELSE (ARRAY['El problema persiste', 'Reapertura por nueva notificación'])[1 + floor(random() * 2)::int]
  END,
  fecha
FROM seed_pasos;

INSERT INTO assignment_changes (id, "incidenciaId", "actorId", "departamentoNuevoId",
                                "equipoNuevoId", "tecnicoNuevoId", motivo, "fechaCreacion")
SELECT gen_random_uuid(), incident_id, actor_id, dep_id, team_id, tech_id,
       (ARRAY['Asignación de incidencia', 'Asignada al equipo de zona', NULL])[1 + floor(random() * 3)::int],
       fecha
FROM seed_pasos
WHERE estado = 'assigned';

-- Priorización automática (sin actor) para las que no tienen la prioridad por defecto.
INSERT INTO priority_changes (id, is_manual, new_priority, cause, created_at, incident_id, user_id)
SELECT gen_random_uuid(), false, priority, 'Priorización automática',
       creada + interval '1 minute', id, NULL
FROM seed_incidencias
WHERE priority <> 'low';

-- ---------------------------------------------------------------------------
-- 8. Comprobaciones finales (si alguna falla se revierte todo)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM seed_incidencias i
    WHERE NOT EXISTS (SELECT 1 FROM "IncidentLocation" l WHERE l."incidentId" = i.id)
  ) THEN
    RAISE EXCEPTION 'Hay incidencias del seed sin ubicación';
  END IF;
  IF EXISTS (
    SELECT 1 FROM seed_incidencias i
    WHERE i.status IS DISTINCT FROM (
      SELECT sc.new_status FROM status_changes sc
      WHERE sc.incident_id = i.id ORDER BY sc.created_at DESC LIMIT 1
    )
  ) THEN
    RAISE EXCEPTION 'El historial no termina en el estado final de la incidencia';
  END IF;
  IF EXISTS (
    SELECT 1 FROM seed_pasos WHERE fecha > now()
  ) THEN
    RAISE EXCEPTION 'Hay cambios de estado con fecha futura';
  END IF;
  IF (SELECT count(*) FROM "SeedIncident") <> 50000 THEN
    RAISE EXCEPTION 'El registro de incidencias del seed no suma 50000';
  END IF;
END $$;

COMMIT;
