# OpsBoard API

Base URL through the local web proxy:

```text
http://localhost:8080
```

Direct API container URL inside Docker network:

```text
http://api:4000
```

## Health

### `GET /health`

Returns API, database, and Redis health.

```json
{
  "api": "ok",
  "database": "ok",
  "redis": "ok",
  "timestamp": "2026-06-15T07:30:15.705Z"
}
```

### `GET /ready`

Readiness probe used by Docker healthchecks.

## Todos

### `GET /api/todos`

Returns cached or database-backed todos.

### `POST /api/todos`

Creates a todo.

```json
{
  "title": "Review Grafana latency dashboard"
}
```

### `PATCH /api/todos/:id`

Updates a todo title or completion state.

```json
{
  "completed": true
}
```

### `DELETE /api/todos/:id`

Deletes a todo.

## Operations

### `GET /api/stats`

Returns dashboard counters including total/open/completed todos, cache counters, uptime, and timestamp.

### `GET /api/platform`

Returns stack, quality gate, observability, and release-path metadata used by the dashboard.

### `GET /metrics`

Prometheus metrics endpoint.
