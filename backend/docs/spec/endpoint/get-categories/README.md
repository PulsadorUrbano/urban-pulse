# GET /categories

Público, sin parámetros. 200 devuelve array de id, name y createdAt ISO, ordenado por código estable. Solo categorías activas, persistidas en PostgreSQL. La migración de cierre establece diez categorías controladas; los nombres y orden del catálogo anterior cambian.
503 si PostgreSQL no está disponible. No crea categorías ni cambia IDs al reiniciar.
Última revisión: 2026-11-17.
