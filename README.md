# OpsBoard: Multi-Service Backend & Caching Platform

[![CI](https://github.com/AnujBehra/Multiservice-docker-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/AnujBehra/Multiservice-docker-Platform/actions)
[![Demo](https://img.shields.io/badge/Demo-Vercel%20Live-000000?logo=vercel&logoColor=white)](https://web-seven-roan-29.vercel.app)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![Node](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](api/package.json)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](docker-compose.yml)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](docker-compose.yml)
[![Observability](https://img.shields.io/badge/Prometheus%20%2B%20Grafana-F46800?logo=grafana&logoColor=white)](monitoring)
[![Nginx](https://img.shields.io/badge/Nginx-Reverse%20Proxy-009639?logo=nginx&logoColor=white)](web/nginx.conf)

OpsBoard is a containerized multi-service platform demonstrating backend service coordination, Redis caching, and full-stack observability:

- **Web:** Nginx reverse proxy serving the static dashboard frontend (`http://localhost:8080`)
- **API:** Node.js / Express REST API with input validation, rate limiting, and OpenAPI/Swagger documentation
- **Database:** PostgreSQL with connection pooling
- **Cache:** Redis caching layer reducing database read latency under concurrent load
- **Observability:** Prometheus metrics scraping and Grafana dashboards tracking throughput and cache hit ratios

## Quick Start

```bash
make up
make smoke
make quality
```

Then open `http://localhost:8080`.

## Architecture & Features

Key engineering practices implemented across the stack:

- **Security & Validation:** Secure headers (`helmet`), IP rate limiting, CORS configuration, and schema validation with `zod`.
- **Database Optimization:** PostgreSQL connection pooling and Redis key-value cache with configurable TTL.
- **Microservices Orchestration:** Multi-stage Dockerfiles orchestrated behind an Nginx reverse proxy with gzip compression and health check routing.
- **Container Health:** Liveness and readiness endpoints (`/health`, `/ready`) configured with Docker health checks and graceful shutdown handling.
- **Observability:** Native Prometheus `/metrics` scraping and pre-provisioned Grafana dashboards for throughput, p95 latency, and cache hit/miss metrics.
- **API Specification:** Fully documented OpenAPI contract (`docs/openapi.yaml`) and API reference (`docs/API.md`).
- **CI/CD Automation:** Automated quality gates in GitHub Actions executing ESLint, unit tests, and Docker Compose validation on push.

## Architecture

- Browser calls frontend on `web`.
- Frontend uses `/api/*` endpoints.
- Nginx proxies `/api/*` and `/health` to `api`.
- API persists todos to PostgreSQL and caches list responses in Redis.
- API exposes Prometheus metrics on `/metrics`.
- Prometheus scrapes API metrics, and Grafana visualizes them.

Detailed architecture notes: `docs/ARCHITECTURE.md`
API reference: `docs/API.md`
OpenAPI contract: `docs/openapi.yaml`

## Endpoints

- `GET /health` → reports API/DB/Redis health
- `GET /ready` → readiness probe used by container healthchecks
- `GET /api/todos` → list todos (cache-aware)
- `POST /api/todos` with body `{ "title": "..." }` → create a todo
- `PATCH /api/todos/:id` with body `{ "completed": true }` or `{ "title": "..." }` → update a todo
- `DELETE /api/todos/:id` → delete a todo
- `GET /api/stats` → backend operational stats for UI cards
- `GET /metrics` → Prometheus metrics for backend and app behavior

## Quick start

Fastest path:

```bash
make up
```

`make up` creates `.env` from `.env.example` if needed and starts the full stack.

Manual path:

```bash
cp .env.example .env
docker compose up --build
```

For local development, the defaults are enough. For alert delivery, update `.env` with SMTP and Slack webhook values.

Open:

- App: `http://localhost:8080`
- Health: `http://localhost:8080/health`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (default login: `admin` / `admin`)

Run a quick smoke test (after stack is up):

```bash
make smoke
```

The smoke test checks health, creates a todo, lists todos, marks the created todo complete, then deletes it.

Run API lint + tests locally:

```bash
make quality
```

Stop:

```bash
make down
```

To remove database volume too:

```bash
make reset
```

## Notes

- Data is persisted in Docker volume `postgres_data`.
- Prometheus data is persisted in `prometheus_data`.
- Grafana data is persisted in `grafana_data`.
- Redis cache TTL for todo list is 30 seconds.
- Fresh databases are seeded with demo tasks unless `DEMO_SEED_ENABLED=false`.
- PostgreSQL and Redis are internal to Docker network by default (no host port mapping).
- You can change runtime settings through `.env` and service defaults in `docker-compose.yml`.
- Hosted static frontends can set `window.__API_BASE_URL__` before `app.js` loads to call a public API URL.

## Alerting

This project includes both Prometheus alert rules and Grafana managed alerting.

### Prometheus rules

Defined in `monitoring/prometheus/alerts/api-alerts.yml`:

- `ApiDown` (critical): API scrape target unavailable for 1 minute
- `HighApiLatencyP95` (warning): p95 latency > 500ms for 5 minutes
- `HighApi5xxRate` (warning): 5xx ratio > 5% for 5 minutes

### Grafana managed alerts + notifications

Provisioned in `monitoring/grafana/provisioning/alerting/`:

- Contact points:
	- `slack-alerts`
	- `email-alerts`
- Notification policy:
	- all alerts route to Slack
	- critical alerts also route to Email
- Managed rules:
	- `API Down (Grafana)`
	- `High API p95 Latency (Grafana)`

Use `.env` to wire your real destinations:

- `SLACK_WEBHOOK_URL`
- `ALERT_EMAIL_TO`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`
- `ALERT_EMAIL_FROM`, `ALERT_EMAIL_FROM_NAME`

## CI

GitHub Actions workflow is in `.github/workflows/ci.yml` and runs:

- API lint (`npm run lint`)
- API tests (`npm test`)
- Compose config validation (`docker compose config`)

## Free deployment (Oracle Cloud Always Free VM)

This repo includes a ready deployment path under `deploy/oracle-free/`.

### 1) Bootstrap your VM once

```bash
bash deploy/oracle-free/bootstrap.sh
```

### 2) Initial deploy from local machine

```bash
bash deploy/oracle-free/deploy.sh <vm_public_ip> <vm_user> <repo_url>
```

### 3) Auto-deploy from GitHub Actions on every push

Workflow file: `.github/workflows/deploy-oracle-free.yml`

