# Dockerfile
FROM node:20-alpine

# Installer les dépendances système
RUN apk update && \
    apk add --no-cache \
    postgresql-client \
    redis

WORKDIR /app

# Copier les fichiers package
COPY package*.json ./

# ✅ Installer TOUTES les dépendances (y compris dev) pour éviter les erreurs
RUN npm install && \
    npm cache clean --force

# Copier le reste du code
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p logs uploads

EXPOSE 5000

CMD ["npm", "start"]