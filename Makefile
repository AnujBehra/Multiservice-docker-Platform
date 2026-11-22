COMPOSE := docker compose
APP_URL ?= http://localhost:8080

.PHONY: help setup up down reset logs ps smoke test lint audit validate quality rebuild

help:
	@printf "OpsBoard commands:\n"
	@printf "  make setup     Create .env if it does not exist\n"
	@printf "  make up        Build and start the full stack\n"
	@printf "  make down      Stop containers\n"
	@printf "  make reset     Stop containers and remove volumes\n"
	@printf "  make smoke     Run end-to-end smoke test\n"
	@printf "  make quality   Run lint, tests, audit, and compose validation\n"
	@printf "  make logs      Follow container logs\n"

setup:
	@test -f .env || cp .env.example .env

up: setup
	$(COMPOSE) up -d --build

rebuild: setup
	$(COMPOSE) up -d --build --force-recreate

down:
	$(COMPOSE) down

reset:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f --tail=120

ps:
	$(COMPOSE) ps

smoke:
	bash scripts/smoke-test.sh $(APP_URL)

test:
	cd api && npm test

lint:
	cd api && npm run lint

audit:
	cd api && npm audit --omit=dev

validate:
	$(COMPOSE) config >/tmp/opsboard-compose.yml

quality: lint test audit validate
