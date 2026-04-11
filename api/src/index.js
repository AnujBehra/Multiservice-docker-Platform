const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const { Pool } = require("pg");
const { createClient } = require("redis");
const promClient = require("prom-client");
const { validateCreateTodo } = require("./validation");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4000;
const corsOrigins = (process.env.CORS_ORIGINS || "*").split(",").map((item) => item.trim());
const todoCacheTtlSeconds = Number(process.env.TODO_CACHE_TTL_SECONDS || 30);

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    customProps: () => ({ service: "multiservice-api" }),
  })
);
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: corsOrigins.includes("*") ? true : corsOrigins,
  })
);
app.use(express.json());
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS_PER_MINUTE || 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please slow down." },
  })
);

const metricsRegistry = new promClient.Registry();
promClient.collectDefaultMetrics({
  register: metricsRegistry,
  prefix: "ms_api_",
});

const httpRequestDuration = new promClient.Histogram({
  name: "ms_api_http_request_duration_ms",
  help: "Duration of HTTP requests in milliseconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [5, 15, 30, 50, 100, 200, 500, 1000, 3000],
  registers: [metricsRegistry],
});

const todosCreatedCounter = new promClient.Counter({
  name: "ms_api_todos_created_total",
  help: "Total number of todos created",
  registers: [metricsRegistry],
});

const cacheHitCounter = new promClient.Counter({
  name: "ms_api_todo_cache_hits_total",
  help: "Total number of todo list cache hits",
  registers: [metricsRegistry],
});

const cacheMissCounter = new promClient.Counter({
  name: "ms_api_todo_cache_misses_total",
  help: "Total number of todo list cache misses",
  registers: [metricsRegistry],
});

const todosTotalGauge = new promClient.Gauge({
  name: "ms_api_todos_total",
  help: "Current total todos in database",
  registers: [metricsRegistry],
});

const appMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
};

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const endedAt = process.hrtime.bigint();
    const durationMs = Number(endedAt - startedAt) / 1_000_000;
    const route = req.route?.path || req.path || "unknown";

    httpRequestDuration
      .labels(req.method, route, String(res.statusCode))
      .observe(durationMs);
  });

  next();
});

const pool = new Pool({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "app_db",
});

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://redis:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err.message);
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

app.get("/health", async (_req, res) => {
  const status = {
    api: "ok",
    database: "down",
    redis: "down",
    timestamp: new Date().toISOString(),
  };

  try {
    await pool.query("SELECT 1");
    status.database = "ok";
  } catch {
    status.database = "down";
  }

  try {
    await redisClient.ping();
    status.redis = "ok";
  } catch {
    status.redis = "down";
  }

  const isHealthy = status.database === "ok" && status.redis === "ok";
  res.status(isHealthy ? 200 : 503).json(status);
});

app.get("/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    await redisClient.ping();
    return res.status(200).json({ ready: true });
  } catch {
    return res.status(503).json({ ready: false });
  }
});

app.get("/api/todos", async (_req, res) => {
  try {
    const cacheKey = "todos:all";
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      cacheHitCounter.inc();
      appMetrics.cacheHits += 1;
      return res.json({ source: "cache", data: JSON.parse(cached) });
    }

    cacheMissCounter.inc();
    appMetrics.cacheMisses += 1;

    const result = await pool.query(
      "SELECT id, title, completed, created_at FROM todos ORDER BY id DESC"
    );

    todosTotalGauge.set(result.rowCount);

    await redisClient.setEx(cacheKey, todoCacheTtlSeconds, JSON.stringify(result.rows));

    return res.json({ source: "database", data: result.rows });
  } catch {
    return res.status(500).json({ message: "Failed to fetch todos" });
  }
});

app.post("/api/todos", async (req, res) => {
  const validation = validateCreateTodo(req.body || {});

  if (!validation.success) {
    return res.status(400).json({
      message: validation.error.issues[0]?.message || "Invalid request payload",
    });
  }

  try {
    const result = await pool.query(
      "INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed, created_at",
      [validation.data.title]
    );

    todosCreatedCounter.inc();
    const countResult = await pool.query("SELECT COUNT(*)::INT AS count FROM todos");
    todosTotalGauge.set(countResult.rows[0].count);

    await redisClient.del("todos:all");

    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ message: "Failed to create todo" });
  }
});

app.get("/api/stats", async (_req, res) => {
  try {
    const dbCountResult = await pool.query("SELECT COUNT(*)::INT AS count FROM todos");
    const cachePing = await redisClient.ping();

    return res.json({
      todosTotal: dbCountResult.rows[0].count,
      cacheHits: appMetrics.cacheHits,
      cacheMisses: appMetrics.cacheMisses,
      cacheConnected: cachePing === "PONG",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error.message);
  return res.status(500).json({ message: "Unexpected server error" });
});

let httpServer;

async function gracefulShutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`);

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }

  await Promise.allSettled([pool.end(), redisClient.quit()]);
  process.exit(0);
}

async function start() {
  try {
    await redisClient.connect();
    await initDb();
    const countResult = await pool.query("SELECT COUNT(*)::INT AS count FROM todos");
    todosTotalGauge.set(countResult.rows[0].count);

    httpServer = app.listen(port, () => {
      console.log(`API service is running on port ${port}`);
    });

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    console.error("Startup failure:", error.message);
    process.exit(1);
  }
}

start();
