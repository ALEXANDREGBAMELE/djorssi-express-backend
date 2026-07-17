#!/bin/bash
# start.sh - Script de démarrage rapide

echo "🚀 Démarrage de Djorssi Express avec Docker"

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Copier le fichier .env
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env..."
    cp .env.docker .env
fi

# Démarrer les conteneurs
echo "🐳 Démarrage des conteneurs..."
docker-compose up -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier le statut
echo "📊 Statut des services :"
docker-compose ps

echo ""
echo "✅ Djorssi Express est démarré !"
echo "📡 Application: http://localhost:5000"
echo "📊 Health: http://localhost:5000/health"
echo "🐘 PostgreSQL: localhost:5432"
echo "🔄 Redis: localhost:6379"
echo "📦 PGAdmin: http://localhost:5050 (admin@djorssi.com / admin123)"
echo ""
echo "Commandes utiles :"
echo "  - Voir les logs : docker-compose logs -f"
echo "  - Arrêter : docker-compose down"
echo "  - Accéder à l'app : docker exec -it djorssi_app sh"