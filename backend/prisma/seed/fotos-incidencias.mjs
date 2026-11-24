// Asigna una foto real a cada incidencia del seed masivo y la guarda en S3.
// Documentación: backend/docs/spec/features/24-11-26-fotos-y-ampliacion-seed/spec.md
//
// Uso (desde backend/, tras pnpm run build):
//   pnpm seed:fotos --dry-run          reparto previsto, sin escribir en S3 ni en la BD
//   pnpm seed:fotos [--limit N] [--concurrencia N]
//
// Variables: DATABASE_URL, S3_BUCKET, S3_REGION y las credenciales AWS de la cadena
// predeterminada del SDK (las mismas que usa el backend).
//
// Paso A: sube una vez las fotos base del manifiesto a incidents/_seed/base/.
// Paso B: para cada incidencia del seed sin fotos, copia una foto base dentro de S3
// (CopyObject, sin descargarla) a incidents/<incidencia>/<uuid>.jpg e inserta la fila
// IncidentImage. Solo inserta la fila si la copia ha ido bien; al relanzarlo continúa
// por las incidencias que siguen sin foto.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIRECTORIO = dirname(fileURLToPath(import.meta.url));
const DIRECTORIO_FOTOS = join(DIRECTORIO, 'fotos');
const PREFIJO_BASE = 'incidents/_seed/base/';
// Hash bcrypt de seed1234: identifica a las cuentas creadas por los seeds.
const HASH_SEED = '$2a$10$.luy7bguVO4N2UOgWJ9hN.GjocHQY3gG/7zUHldbyZo41cBz2Hl5i';
const TAMANO_LOTE = 500;

function leerArgumentos(argv) {
  const opciones = { dryRun: false, limite: null, concurrencia: 32 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') opciones.dryRun = true;
    else if (arg === '--limit') opciones.limite = Number(argv[++i]);
    else if (arg === '--concurrencia') opciones.concurrencia = Number(argv[++i]);
    else throw new Error(`Argumento desconocido: ${arg}`);
  }
  for (const [nombre, valor] of [['--limit', opciones.limite], ['--concurrencia', opciones.concurrencia]]) {
    if (valor !== null && (!Number.isInteger(valor) || valor < 1))
      throw new Error(`${nombre} debe ser un entero positivo`);
  }
  return opciones;
}

function exigirVariable(nombre) {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

async function cargarPrisma() {
  try {
    const { PrismaClient } = await import('../../dist/generated/prisma/client.js');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const adapter = new PrismaPg({ connectionString: exigirVariable('DATABASE_URL') });
    return new PrismaClient({ adapter });
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND')
      throw new Error('No se encuentra el cliente Prisma compilado: ejecutar antes pnpm run build');
    throw error;
  }
}

// Índice estable a partir del UUID de la incidencia: la misma incidencia recibe
// siempre la misma foto, y el reparto entre fotos es uniforme.
function indiceEstable(uuid, tamano) {
  return Number.parseInt(uuid.replaceAll('-', '').slice(-8), 16) % tamano;
}

// Prioridad: foto de la misma plantilla (título); si no, del mismo activo y categoría;
// si no, de la categoría. El respaldo por activo solo se usa si la incidencia tiene
// activo, para no mezclar plantillas sin activo distintas (por ejemplo, atascos y pasos
// de cebra).
function crearSelector(manifiesto) {
  const porTitulo = new Map();
  const porActivo = new Map();
  const porCategoria = new Map();
  const anadir = (mapa, clave, foto) => {
    if (!mapa.has(clave)) mapa.set(clave, []);
    mapa.get(clave).push(foto);
  };
  for (const foto of manifiesto) {
    for (const titulo of foto.titulos) anadir(porTitulo, titulo, foto);
    if (foto.activo) anadir(porActivo, `${foto.categoria}|${foto.activo}`, foto);
    anadir(porCategoria, foto.categoria, foto);
  }
  return (incidencia) => {
    const opciones =
      porTitulo.get(incidencia.title) ??
      (incidencia.activo ? porActivo.get(`${incidencia.categoria}|${incidencia.activo}`) : undefined) ??
      porCategoria.get(incidencia.categoria);
    if (!opciones) return null;
    return opciones[indiceEstable(incidencia.id, opciones.length)];
  };
}

async function subirFotosBase(s3, comandos, bucket, manifiesto) {
  let subidas = 0;
  for (const foto of manifiesto) {
    const Key = PREFIJO_BASE + foto.archivo;
    try {
      await s3.send(new comandos.HeadObjectCommand({ Bucket: bucket, Key }));
      continue;
    } catch (error) {
      // Sin s3:ListBucket (la política del backend no lo concede), S3 responde 403 en
      // lugar de 404 cuando el objeto no existe. En ambos casos se intenta subirlo; si
      // falta permiso de escritura, PutObject fallará con AccessDenied.
      if (![403, 404].includes(error?.$metadata?.httpStatusCode)) throw error;
    }
    const Body = await readFile(join(DIRECTORIO_FOTOS, foto.archivo));
    await s3.send(new comandos.PutObjectCommand({ Bucket: bucket, Key, Body, ContentType: 'image/jpeg' }));
    subidas++;
  }
  console.log(`Paso A: ${subidas} fotos base subidas, ${manifiesto.length - subidas} ya estaban en S3.`);
}

async function main() {
  const opciones = leerArgumentos(process.argv.slice(2));
  const manifiesto = JSON.parse(await readFile(join(DIRECTORIO_FOTOS, 'manifest.json'), 'utf8'));
  const elegir = crearSelector(manifiesto);
  const prisma = await cargarPrisma();

  try {
    const incidencias = await prisma.$queryRawUnsafe(
      `SELECT i.id::text AS id, i.title, c.code AS categoria, ua.name AS activo,
              i."createdAt" AS creada
       FROM "Incident" i
       JOIN users u ON u.id = i."civicId"
       JOIN "Category" c ON c.id = i."categoryId"
       LEFT JOIN "UrbanAsset" ua ON ua.id = i."urbanAssetId"
       WHERE u.password = $1
         AND NOT EXISTS (SELECT 1 FROM "IncidentImage" im WHERE im."incidentId" = i.id)
       ORDER BY i.id
       ${opciones.limite ? `LIMIT ${opciones.limite}` : ''}`,
      HASH_SEED,
    );

    const asignaciones = [];
    let sinFoto = 0;
    const reparto = new Map();
    for (const incidencia of incidencias) {
      const foto = elegir(incidencia);
      if (!foto) {
        sinFoto++;
        continue;
      }
      asignaciones.push({ incidencia, foto });
      reparto.set(foto.archivo, (reparto.get(foto.archivo) ?? 0) + 1);
    }
    console.log(
      `Incidencias del seed sin foto: ${incidencias.length}. Con foto asignable: ${asignaciones.length}. ` +
        `Sin foto compatible: ${sinFoto}. Fotos distintas usadas: ${reparto.size}/${manifiesto.length}.`,
    );

    if (opciones.dryRun) {
      const ordenado = [...reparto].sort((a, b) => b[1] - a[1]);
      console.log('Fotos más usadas:', ordenado.slice(0, 5));
      console.log('Fotos menos usadas:', ordenado.slice(-5));
      console.log('Modo --dry-run: no se ha escrito nada.');
      return;
    }
    if (asignaciones.length === 0) return;

    const bucket = exigirVariable('S3_BUCKET');
    const comandos = await import('@aws-sdk/client-s3');
    const s3 = new comandos.S3Client({ region: exigirVariable('S3_REGION') });
    await subirFotosBase(s3, comandos, bucket, manifiesto);

    let pendientes = [];
    let insertadas = 0;
    let fallidas = 0;
    const volcar = async () => {
      if (pendientes.length === 0) return;
      const lote = pendientes;
      pendientes = [];
      await prisma.incidentImage.createMany({ data: lote });
      insertadas += lote.length;
    };

    let siguiente = 0;
    const trabajador = async () => {
      while (siguiente < asignaciones.length) {
        const { incidencia, foto } = asignaciones[siguiente++];
        const id = randomUUID();
        const objectKey = `incidents/${incidencia.id}/${id}.jpg`;
        try {
          await s3.send(
            new comandos.CopyObjectCommand({
              Bucket: bucket,
              Key: objectKey,
              CopySource: encodeURI(`${bucket}/${PREFIJO_BASE}${foto.archivo}`),
              ContentType: 'image/jpeg',
              MetadataDirective: 'REPLACE',
            }),
          );
        } catch (error) {
          fallidas++;
          console.error(`No se pudo copiar la foto de ${incidencia.id}: ${describirError(error)}`);
          continue;
        }
        pendientes.push({
          id,
          incidentId: incidencia.id,
          objectKey,
          mimeType: 'image/jpeg',
          createdAt: incidencia.creada,
        });
        if (pendientes.length >= TAMANO_LOTE) {
          await volcar();
          console.log(`Paso B: ${insertadas}/${asignaciones.length} fotos registradas.`);
        }
      }
    };
    await Promise.all(Array.from({ length: opciones.concurrencia }, trabajador));
    await volcar();
    console.log(`Paso B terminado: ${insertadas} fotos registradas, ${fallidas} copias fallidas.`);
    if (fallidas > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Los errores de S3 sin cuerpo (por ejemplo, en HeadObject) llegan como "UnknownError":
// se añade el código HTTP para poder diagnosticarlos.
function describirError(error) {
  const estado = error?.$metadata?.httpStatusCode;
  const mensaje = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return estado ? `${mensaje} (HTTP ${estado})` : mensaje;
}

main().catch((error) => {
  console.error(describirError(error));
  process.exitCode = 1;
});
