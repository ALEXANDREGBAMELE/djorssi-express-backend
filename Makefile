# Makefile
.PHONY: help up down logs build dev clean psql redis shell test

help:
	@echo "📦 Djorssi Express - Commandes Docker"
	@echo "====================================="
	@echo "make up         → Démarrer les conteneurs"
	@echo "make down       → Arrêter les conteneurs"
	@echo "make logs       → Voir les logs"
	@echo "make build      → Reconstruire les images"
	@echo "make dev        → Démarrer en mode développement"
	@echo "make clean      → Nettoyer tout (volume inclus)"
	@echo "make psql       → Accéder à PostgreSQL"
	@echo "make redis      → Accéder à Redis"
	@echo "make shell      → Accéder au shell du conteneur app"
	@echo "make restart    → Redémarrer les conteneurs"
	@echo "make status     → Voir le statut des conteneurs"

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

build:
	docker-compose build --no-cache

dev:
	docker-compose -f docker-compose.dev.yml up -d

clean:
	docker-compose down -v
	docker system prune -f

psql:
	docker exec -it djorssi_postgres psql -U djorssi_user -d djorssi_express_db

redis:
	docker exec -it djorssi_redis redis-cli

shell:
	docker exec -it djorssi_app sh

restart:
	docker-compose restart

status:
	docker-compose ps

migrate:
	docker exec -it djorssi_app npm run migrate

seed:
	docker exec -it djorssi_app npm run seed

test:
	docker exec -it djorssi_app npm test