# 2026-10-26 - Plan para resolver conflictos de backend con token

- Objetivo: resolver el merge preservando autenticación e incidencias, e informar de sus conflictos.
- Especificación: [Requisitos y criterios](../specs/2026-10-26-resolver-conflictos-backend-con-token-spec.md).
- Rama: fix-resolve-backend-conflicts.
- Arquitectura: módulos existentes, esquema combinado y cliente regenerado.
- Estado: resolución completada y verificada en backend; merge pendiente de commit.

## Restricciones generales

Sin npm install ni pnpm install, DB, servidor, migraciones, e2e/integración, commit o push. Conservar funcionalidades de ambas ramas. Informe adicional autorizado explícitamente; seguimiento y confirmación se mantienen aquí.

## Preparación y tareas

- [x] Actualizar origen y verificar checkout limpio antes del merge.
- [x] Ejecutar merge --no-commit --no-ff: 17 conflictos.
- [x] Crear fix-resolve-backend-conflicts desde d37c4ab sin perder índice ni MERGE_HEAD. git switch no permite cambiar durante merge; se creó la referencia y se trasladó HEAD sin tocar archivos.
- [x] Recuperar auth completo y unitarias del origen, incluyendo dependencias eliminadas que Git no recuperaba automáticamente.
- [x] Combinar esquema, cliente generado, catálogo y configuración; registrar ambos módulos y conservar estáticos.
- [x] Mantener Prisma 7.10.1, incorporar JWT/bcrypt y corregir lockfile inconsistente.
- [x] Ejecutar Prisma generate/validate, npm test, npm run build y npm run lint.
- [x] Cerrar revisión de código, informe y enlaces.
- [x] Marcar resueltos los conflictos del backend sin crear commit.

## Decisiones y evidencia de ejecución

- Origen 8ea1ddc; destino inicial d37c4ab. La rama original no debe avanzar; toda resolución pertenece a fix-resolve-backend-conflicts.
- Autenticación requiere DB y configuración JWT al iniciar la API. No se inicia en esta tarea; DB_SYNC vacío en el ejemplo y semilla heredada sin ejecutar. Incidencias conserva Map y archivos locales, con identidad declarada todavía pendiente de verificar.
- Se intentó npm ci con manifiesto y lock del origen: falló EUSAGE por inconsistencia del lock. Se conservó manifiesto/lock de destino como base, se incorporaron JWT/bcrypt y se corrigió solo el lock con npm update @nestjs/jwt bcryptjs --package-lock-only --ignore-scripts --no-audit --no-fund. npm ci posterior correcto: 463 paquetes.
- Prisma generate y validate correctos, versión 7.10.1 y sin conexión DB.
- npm test: 17 suites y 175 pruebas correctas de ambas áreas.
- npm run build: correcto.
- npm run lint: sin errores, cuatro avisos heredados: dos de Unicode en create-incident.pipe.ts, uno de variable sin usar en dev-seed.service.spec.ts y uno de spread de instancia en auth.service.spec.ts.
- Se preservan los cambios frontend-web incorporados automáticamente por la rama origen, sin editarlos manualmente ni verificarlos en esta tarea centrada en backend. No deben confundirse con nuevos cambios frontend desarrollados aquí.
- Las deudas #27/#47/#28 permanecen abiertas: añadir auth no autentica automáticamente las rutas de incidencias ni vincula civicId al token.

## Comprobaciones finales

| Comprobación | Resultado real |
| --- | --- |
| Dependencias | npm ci --ignore-scripts correcto tras reparar lockfile |
| Esquema y generación | Prisma 7.10.1 correcto, sin DB |
| Unitarias | 17 suites, 175 pruebas correctas |
| Compilación | Correcta |
| Lint | Sin errores; cuatro avisos heredados |
| Diff, enlaces e índice | Backend sin errores; 8 documentos sin enlaces ausentes; 0 conflictos y 0 marcadores. Diff global con espacios finales heredados de frontend-web |

## Confirmación de implementación

- Estado final: resolución de backend implementada y verificada; merge abierto sin commit.
- Fecha: 2026-10-26.
- Criterios 1 a 6 cumplidos: rama nueva activa y rama original en d37c4ab; cero conflictos/marcadores; esquema y módulos combinados; 175 pruebas, build y lint; catálogo/configuración e informe revisados.
- Merge abierto sin commit ni push. No afirmar integración publicada.
- Informe: [Conflictos y resolución](../../reports/2026-10-26-conflictos-fusion-token-backend.md).

- Revisión final: revisor independiente sin hallazgos accionables en inspección estática; acceso Git limitado en su sandbox, sin ejecución adicional de pruebas. La comprobación del índice y referencias la realizó el agente principal.
- Diff: git diff --cached --check -- backend correcto. El diff global informa espacios finales en archivos de frontend-web heredados del origen; no se corrigieron por estar fuera del alcance backend.
- Documentación: 8 documentos comprobados, sin enlaces ausentes. No hay marcadores de merge en backend ni entradas Git sin resolver.
- Arranque: no verificado contra DB real; modos DB_SYNC heredados no ejercitados. Configuración JWT y DATABASE_URL necesaria antes de iniciar la API.
