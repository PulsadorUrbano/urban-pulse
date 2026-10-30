# Usa una imagen oficial de Node.js ligera como base
FROM node:22-alpine

# Define el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias (package.json y package-lock.json)
COPY package*.json ./

# Instala las dependencias del proyecto
RUN npm install -g @nestjs/cli

RUN npm install

# Copia el resto del código fuente del proyecto
COPY . .

# Expone el puerto que utiliza tu aplicación (cambia 3000 por el tuyo si es necesario)
EXPOSE 3000

# Comando por defecto para ejecutar la aplicación
CMD ["npm", "run", "deploy"]