# Cloudinary

Añade CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET del panel de Cloudinary a backend/.env y reinicia el backend. No versiones ese archivo. Para Docker Compose, añade las variables al .env de la raíz, que ya se carga mediante env_file.

POST /images requiere Authorization: Bearer <token> y Content-Type: application/json.

Cuerpo: { "imagen": "data:image/png;base64,..." }

Respuesta 201: { "publicId": "identificador", "url": "https://..." }

Acepta JPEG, PNG y WebP de hasta 5 MB. Cloudinary verifica el contenido del archivo. Devuelve 400 para entradas inválidas, 401 sin autenticación, 503 si faltan credenciales y 502 si falla Cloudinary. Tiempo máximo de espera: 30 segundos.

La subida almacena la imagen en Cloudinary. No crea relaciones en PostgreSQL ni conecta todavía los formularios del frontend. No se ha realizado una subida real sin credenciales.

Referencia: https://cloudinary.com/documentation/authentication_signatures
