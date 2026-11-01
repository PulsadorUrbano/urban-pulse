# ADR-0006: Estrategia de autenticación por doble token

**Estado**: 
	Aproved

**Contexto**: 
	Se está desarrollando una aplicación móvil con un único backend y BBDD (Postgres) y se necesita un sistema seguro de autenticación.

**Opciones consideradas**:
- Sesiones clásicas con Cookies de sesión (problemas con React Native, penaliza rendimiento backend)

- Token JWT único de larga sesión (malicioso puede interceptarlo y tener sesión hasta que caduque, aprox 30 días; logout real no existe a no ser que se complique backend, quitando el stateless). Si no queremos tener en cuenta una seguridad importante, es el más fácil de implementar.

- BaaS (Deberíamos cambiar stack tecnológico y depender del proveedor, como Supabase)

- JWT Dual-Token Pattern: El cliente almacena access token (token temporal de 15 mins aprox) y el refresh token (token largo de 30 días por ejemplo) en un sitio seguro dentro del dispositivo. El backend almacena el refresh token. Es muy seguro en aplicaciones de teléfono y eficiente. Es un híbrido entre una sesión clásica y un token JWT

**Decisión**:
	JWT Dual-Token Pattern

**Consecuencias**:

+ + Seguridad 
+ + Logout real
+ + Eficiencia

- - Consulta a la BBDD cada X minutos
- - Crear tabla nueva con tokens apuntando a users en BBDD
- - Complejidad añadida en el cliente (debe gestionar la renovación automática de Tokens)

JWT Básico - 100%
JWT doble - etiqueta gris


