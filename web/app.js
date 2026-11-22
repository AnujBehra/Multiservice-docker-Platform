const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoList = document.getElementById("todo-list");
const refreshButton = document.getElementById("refresh-btn");
const statusEl = document.getElementById("status");
const apiStateEl = document.getElementById("api-state");
const dbStateEl = document.getElementById("db-state");
const redisStateEl = document.getElementById("redis-state");
const todosCountEl = document.getElementById("todos-count");
const todosOpenEl = document.getElementById("todos-open");
const todosCompletedEl = document.getElementById("todos-completed");
const cacheHitsEl = document.getElementById("cache-hits");
const cacheMissesEl = document.getElementById("cache-misses");
const uptimeEl = document.getElementById("uptime");
const updatedAtEl = document.getElementById("updated-at");
const apiBaseEl = document.getElementById("api-base");
const environmentEl = document.getElementById("environment");
const platformGridEl = document.getElementById("platform-grid");
const HOSTED_DEMO_API_BASE_URL = "";
const API_BASE_URL = (
  window.__API_BASE_URL__ ||
  (window.location.hostname.endsWith("vercel.app") ? HOSTED_DEMO_API_BASE_URL : "")
).replace(/\/+$/, "");

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function hostedBackendHint() {
  if (window.location.hostname.endsWith("vercel.app") && !API_BASE_URL) {
    return "Backend not connected on hosted frontend. Set window.__API_BASE_URL__ in index.html to a public API URL.";
  }

  return "";
}

function setStatus(message, tone = "neutral") {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

function formatUptime(totalSeconds = 0) {
  const seconds = Number(totalSeconds) || 0;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}

async function parseError(response, fallback) {
  try {
    const payload = await response.json();
    return payload.message || fallback;
  } catch {
    return fallback;
  }
}

function decorateState(element, value) {
  element.textContent = value || "unknown";
  element.classList.remove("ok", "down");
  element.classList.add(value === "ok" ? "ok" : "down");
}

async function loadHealthAndStats() {
  try {
    const [healthResponse, statsResponse] = await Promise.all([
      fetch(apiUrl("/health")),
      fetch(apiUrl("/api/stats")),
    ]);

    if (!healthResponse.ok) {
      throw new Error("Health endpoint unavailable");
    }

    if (!statsResponse.ok) {
      throw new Error("Stats endpoint unavailable");
    }

    const health = await healthResponse.json();
    const stats = await statsResponse.json();

    decorateState(apiStateEl, health.api);
    decorateState(dbStateEl, health.database);
    decorateState(redisStateEl, health.redis);

    todosCountEl.textContent = String(stats.todosTotal ?? 0);
    todosOpenEl.textContent = String(stats.todosOpen ?? 0);
    todosCompletedEl.textContent = String(stats.todosCompleted ?? 0);
    cacheHitsEl.textContent = String(stats.cacheHits ?? 0);
    cacheMissesEl.textContent = String(stats.cacheMisses ?? 0);
    uptimeEl.textContent = formatUptime(stats.uptimeSeconds);
    updatedAtEl.textContent = new Date(stats.timestamp).toLocaleTimeString();
  } catch (error) {
    setStatus(hostedBackendHint() || error.message, "danger");
  }
}

function createProofCard(title, items) {
  const card = document.createElement("article");
  card.className = "proof-card";

  const heading = document.createElement("h3");
  heading.textContent = title;
  card.appendChild(heading);

  const list = document.createElement("ul");

  for (const item of items) {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    list.appendChild(listItem);
  }

  card.appendChild(list);
  return card;
}

async function loadPlatformEvidence() {
  try {
    const response = await fetch(apiUrl("/api/platform"));

    if (!response.ok) {
      throw new Error(await parseError(response, "Failed to fetch platform evidence"));
    }

    const platform = await response.json();
    environmentEl.textContent = platform.environment || "development";
    platformGridEl.innerHTML = "";
    platformGridEl.appendChild(createProofCard("Stack", platform.stack || []));
    platformGridEl.appendChild(createProofCard("Quality Gates", platform.qualityGates || []));
    platformGridEl.appendChild(
      createProofCard("Observability", [
        platform.observability?.metrics || "/metrics",
        platform.observability?.dashboards || "Grafana dashboards",
        platform.observability?.alerts || "Alert rules",
      ])
    );
    platformGridEl.appendChild(createProofCard("Release Path", [platform.releasePath || "Docker Compose"]));
  } catch (error) {
    platformGridEl.innerHTML = "";
    platformGridEl.appendChild(createProofCard("Platform", [hostedBackendHint() || error.message]));
  }
}

async function loadTodos() {
  try {
    setStatus("Loading todos...");

    const response = await fetch(apiUrl("/api/todos"));
    if (!response.ok) {
      throw new Error(await parseError(response, "Failed to fetch todos"));
    }

    const payload = await response.json();
    renderTodos(payload.data || []);
    setStatus(`Loaded from ${payload.source} at ${new Date().toLocaleTimeString()}`, "success");
  } catch (error) {
    setStatus(hostedBackendHint() || error.message, "danger");
  }
}

function renderTodos(todos) {
  todoList.innerHTML = "";

  if (!todos.length) {
    const item = document.createElement("li");
    item.className = "empty-state";
    item.textContent = "No todos yet. Add the first operational task.";
    todoList.appendChild(item);
    return;
  }

  for (const todo of todos) {
    const item = document.createElement("li");
    item.className = todo.completed ? "completed" : "";

    const content = document.createElement("div");
    content.className = "todo-content";
    const title = document.createElement("span");
    title.className = "todo-title";
    title.textContent = todo.title;

    const createdAt = document.createElement("span");
    createdAt.className = "todo-time";
    createdAt.textContent = new Date(todo.created_at).toLocaleString();

    content.appendChild(title);
    content.appendChild(createdAt);

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const completeButton = document.createElement("button");
    completeButton.type = "button";
    completeButton.className = "small-btn";
    completeButton.textContent = todo.completed ? "Reopen" : "Done";
    completeButton.addEventListener("click", () => updateTodo(todo.id, { completed: !todo.completed }));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "small-btn danger-btn";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteTodo(todo.id));

    actions.appendChild(completeButton);
    actions.appendChild(deleteButton);
    item.appendChild(content);
    item.appendChild(actions);
    todoList.appendChild(item);
  }
}

async function refreshDashboard() {
  await loadTodos();
  await loadHealthAndStats();
}

async function updateTodo(id, updates) {
  try {
    const response = await fetch(apiUrl(`/api/todos/${id}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "Failed to update todo"));
    }

    await refreshDashboard();
  } catch (error) {
    setStatus(hostedBackendHint() || error.message, "danger");
  }
}

async function deleteTodo(id) {
  try {
    const response = await fetch(apiUrl(`/api/todos/${id}`), {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "Failed to delete todo"));
    }

    await refreshDashboard();
  } catch (error) {
    setStatus(hostedBackendHint() || error.message, "danger");
  }
}

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = todoInput.value.trim();
  if (!title) {
    return;
  }

  try {
    const response = await fetch(apiUrl("/api/todos"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "Failed to create todo"));
    }

    todoInput.value = "";
    await refreshDashboard();
  } catch (error) {
    setStatus(hostedBackendHint() || error.message, "danger");
  }
});

refreshButton.addEventListener("click", async () => {
  await refreshDashboard();
});

async function init() {
  apiBaseEl.textContent = API_BASE_URL ? new URL(API_BASE_URL).host : "local proxy";
  await Promise.all([refreshDashboard(), loadPlatformEvidence()]);
}

init();
