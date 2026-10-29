# -------------------------------------------------------------
# Etapa 1: Construcción (Build)
# -------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.8 --activate

# Copiar configuración de dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copiar el código fuente y compilar TypeScript a JavaScript (carpeta /dist)
COPY . .
RUN pnpm run build

# -------------------------------------------------------------
# Etapa 2: Producción
# -------------------------------------------------------------
FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.8 --activate

# Instalar solo dependencias de producción para reducir el tamaño de la imagen
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copiar la compilación generada en la etapa anterior
COPY --from=builder /app/dist ./dist

# Exponer el puerto configurado en main.ts (asegúrate de que NestJS escuche en el 4000)
EXPOSE 4000

# Levantar el servidor compilado
CMD ["pnpm", "run", "start:prod"]