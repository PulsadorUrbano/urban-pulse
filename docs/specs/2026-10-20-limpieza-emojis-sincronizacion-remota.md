# Limpieza de texto y sincronizacion remota

- Fecha: 2026-10-20.
- Rama: feature/registro-incidencia.
- Fuente de verdad: origin/feature/registro-incidencia, commit 961402de7f48f58dd5ea9bc0960ce7a1b9204bc7.

## Alcance autorizado

Resolver la fusion pendiente usando el arbol remoto como referencia completa. Conservar un bundle de recuperacion del commit local anterior fuera del repositorio. El contrato remoto vuelve a establecer el titulo entre 4 y 25 caracteres; esta instruccion sustituye el cambio local previo a 4-50.

Eliminar emojis de los textos versionados y conservar el significado de las pruebas Unicode usando caracteres suplementarios que no sean emojis. Registrar la preferencia en AGENTS.md. No modificar dependencias, imagenes binarias ni codigo generado.

## Criterios de aceptacion

- Ninguna ruta con conflictos ni marcadores de fusion.
- La fusion incorpora exactamente el arbol remoto; la limpieza queda como cambios locales posteriores.
- Ningun emoji literal en los archivos de texto versionados revisados.
- Las pruebas Unicode mantienen caracteres fuera del plano multilingue basico.
- No hacer push.

## Verificacion

Fusion completada en el commit 3922495; su arbol coincide exactamente con el remoto. No quedan rutas en conflicto. La limpieza de texto permanece sin commit.

Se eliminaron 52 apariciones de emojis en 20 archivos de texto, sustituyendo los ejemplos Unicode de pruebas por caracteres suplementarios no emoji. Escaneo de 278 archivos de texto versionados sin emojis restantes. Se incorpora la regla en AGENTS.md.

Backend: build y lint correctos (dos avisos Unicode existentes), 31 pruebas unitarias y 11 e2e correctas. Movil: 288 pruebas correctas, lint y typecheck correctos. Total: 330 pruebas. Manifiestos y lockfiles sin cambios respecto al remoto. No se hizo push.
