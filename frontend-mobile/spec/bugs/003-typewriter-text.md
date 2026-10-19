# Bug · TypewriterText — test desincronizado con el `speedMs` por defecto

1. El test `src/__tests__/components/typewriter-text.test.tsx` → "usa 45 ms por defecto cuando no se pasa speedMs" falla.

   - **Causa:** el valor por defecto de `speedMs` en `src/components/typewriter-text.tsx:10` se cambió a **35 ms**, pero el test sigue asumiendo **45 ms** (espera texto vacío tras avanzar 44 ms y el primer carácter `'H'` al llegar a 45 ms). Con 35 ms, el primer carácter ya aparece antes (a los 35 ms), por lo que a los 44 ms el test recibe `'H'` en vez de `''`.
   - **Detectado:** al cerrar la feature 003-integracion-token (`npx jest` → 223 passed / 1 failed). No es una regresión de la 003: el componente y su test son idénticos a la rama base.
   - **Arreglo sugerido:** actualizar el test al nuevo valor por defecto (p. ej. vacío a 34 ms, `'H'` a 35 ms) o, si el default debe ser 45, revertir `speedMs` en el componente. Alinear el nombre del test ("45 ms") con el valor real elegido.
