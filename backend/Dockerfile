# -------------------------------------------------------------
# Etapa 1: Construcción (Build)
# -------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar configuración de dependencias
COPY package*.json ./
RUN npm install

# Copiar el código fuente y compilar TypeScript a JavaScript (carpeta /dist)
COPY . .
RUN npm run build

# -------------------------------------------------------------
# Etapa 2: Producción
# -------------------------------------------------------------
FROM node:20-alpine
WORKDIR /app

# Instalar solo dependencias de producción para reducir el tamaño de la imagen
COPY package*.json ./
RUN npm install --only=production

# Copiar la compilación generada en la etapa anterior
COPY --from=builder /app/dist ./dist

# Exponer el puerto configurado en main.ts (asegúrate de que NestJS escuche en el 4000)
EXPOSE 4000

# Levantar el servidor compilado
CMD ["npm", "run", "start:prod"]