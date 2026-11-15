FROM node:22-alpine AS dependencies
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.8 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["pnpm", "run", "start:dev"]

FROM dependencies AS builder
COPY . .
RUN pnpm run build

FROM node:22-alpine AS production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.8 --activate

# Instalar solo dependencias de producción para reducir el tamaño de la imagen
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copiar la compilación generada en la etapa anterior
COPY --from=builder /app/dist ./dist

# Levantar el servidor compilado
EXPOSE 3000
CMD ["pnpm", "run", "start:prod"]
