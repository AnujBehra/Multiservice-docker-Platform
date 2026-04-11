# Multi-Service Dockerized Application

This project is a complete multi-service app running with Docker Compose:

- `web` → Nginx + static frontend (served on `http://localhost:8080`)
- `api` → Node.js/Express REST API
- `db` → PostgreSQL
- `redis` → Redis cache
- `prometheus` → metrics scraping + storage
- `grafana` → monitoring dashboards

## Why this is job-ready

The stack now includes production-oriented practices commonly expected in industry teams:

- Secure API middleware (`helmet`, rate limiting, CORS config, compression)
- Structured request logging (`pino-http`)
- Input validation with schema-based checks (`zod`)
- Readiness endpoint (`/ready`) + Docker healthchecks
- Graceful shutdown handling for containers
- Metrics + dashboards + alerting (Prometheus + Grafana)
- Automated quality gates in CI (lint, tests, compose validation)

## Architecture

- Browser calls frontend on `web`.
- Frontend uses `/api/*` endpoints.
- Nginx proxies `/api/*` and `/health` to `api`.
- API persists todos to PostgreSQL and caches list responses in Redis.
- API exposes Prometheus metrics on `/metrics`.
- Prometheus scrapes API metrics, and Grafana visualizes them.

## Endpoints

- `GET /health` → reports API/DB/Redis health
- `GET /ready` → readiness probe used by container healthchecks
- `GET /api/todos` → list todos (cache-aware)
- `POST /api/todos` with body `{ "title": "..." }` → create a todo
- `GET /api/stats` → backend operational stats for UI cards
- `GET /metrics` → Prometheus metrics for backend and app behavior

## Quick start

Create alerting environment config first:

```bash
cp .env.example .env
```

Then update `.env` with your SMTP and Slack webhook values.

```bash
docker compose up --build
```

Open:

- App: `http://localhost:8080`
- Health: `http://localhost:8080/health`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (default login: `admin` / `admin`)

Run a quick smoke test (after stack is up):

```bash
bash scripts/smoke-test.sh
```

Run API lint + tests locally:

```bash
cd api
npm install
npm run lint
npm test
```

Stop:

```bash
docker compose down
```

To remove database volume too:

```bash
docker compose down -v
```

## Notes

- Data is persisted in Docker volume `postgres_data`.
- Prometheus data is persisted in `prometheus_data`.
- Grafana data is persisted in `grafana_data`.
- Redis cache TTL for todo list is 30 seconds.
- PostgreSQL and Redis are internal to Docker network by default (no host port mapping).
- You can change ports/credentials in `docker-compose.yml`.

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

