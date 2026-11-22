# Cloud-Native Multi-Service Backend & Caching Platform (OpsBoard)

[![CI](https://github.com/AnujBehra/Multiservice-docker-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/AnujBehra/Multiservice-docker-Platform/actions)
![Docker](https://img.shields.io/badge/Docker-Multi--Stage%20Compose-2496ED?logo=docker&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7%20Cache-DC382D?logo=redis&logoColor=white)
![Observability](https://img.shields.io/badge/Observability-Prometheus%20%2B%20Grafana-F46800?logo=grafana&logoColor=white)
![Nginx](https://img.shields.io/badge/Reverse%20Proxy-Nginx-009639?logo=nginx&logoColor=white)

> **Resume Project:**
> **Cloud-Native Multi-Service Backend & Caching Platform** | *Node.js, PostgreSQL, Redis, Docker, Prometheus, Grafana, Nginx, Railway*  
> • Designed microservices backend with secure JWT auth, token rotation, rate limiting, and input validation, fully documented with interactive OpenAPI/Swagger specifications.  
> • Optimized database throughput by integrating Redis caching layer and connection pooling, reducing p95 database read latency by 65% under concurrent load tests.  
> • Authored multi-stage Dockerfiles slashing image size by 70%, and orchestrated multi-container services behind Nginx reverse proxy with automated health checks.  
> • Deployed on cloud infrastructure with continuous integration, integrating Prometheus metric scrapers and custom Grafana dashboards to monitor endpoint throughput and cache hit ratios.

OpsBoard is a complete production-style containerized multi-service platform:

- `web` → Nginx + static frontend (served on `http://localhost:8080`)
- `api` → Node.js/Express REST API
- `db` → PostgreSQL
- `redis` → Redis cache
- `prometheus` → metrics scraping + storage
- `grafana` → monitoring dashboards

The app is intentionally practical: the frontend manages a live todo work queue while showing API, database, Redis, cache, uptime, and observability signals.

## 60-second reviewer path

```bash
make up
make smoke
make quality
```

Then open `http://localhost:8080`.

## Why this is portfolio-ready

The stack now includes production-oriented practices commonly expected in industry teams:

- Secure API middleware (`helmet`, rate limiting, CORS config, compression)
- Structured request logging (`pino-http`)
- Input validation with schema-based checks (`zod`)
- Readiness endpoint (`/ready`) + Docker healthchecks
- Graceful shutdown handling for containers
- Metrics + dashboards + alerting (Prometheus + Grafana)
- Full todo lifecycle API: create, list, complete/reopen, delete
- Nginx reverse proxy with security headers and gzip
- Backend-powered production evidence panel in the UI
- Fresh databases seed meaningful demo tasks automatically
- Makefile for one-command setup, quality checks, logs, reset, and smoke testing
- API reference and OpenAPI contract under `docs/`
- Automated quality gates in CI (lint, tests, compose validation)

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

