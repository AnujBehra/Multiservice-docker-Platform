const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoList = document.getElementById("todo-list");
const refreshButton = document.getElementById("refresh-btn");
const statusEl = document.getElementById("status");
const apiStateEl = document.getElementById("api-state");
const dbStateEl = document.getElementById("db-state");
const redisStateEl = document.getElementById("redis-state");
const todosCountEl = document.getElementById("todos-count");
const cacheHitsEl = document.getElementById("cache-hits");
const cacheMissesEl = document.getElementById("cache-misses");

function decorateState(element, value) {
  element.textContent = value || "unknown";
  element.classList.remove("ok", "down");
  element.classList.add(value === "ok" ? "ok" : "down");
}

async function loadHealthAndStats() {
  try {
    const [healthResponse, statsResponse] = await Promise.all([
      fetch("/health"),
      fetch("/api/stats"),
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
    cacheHitsEl.textContent = String(stats.cacheHits ?? 0);
    cacheMissesEl.textContent = String(stats.cacheMisses ?? 0);
  } catch (error) {
    statusEl.textContent = error.message;
  }
}

async function loadTodos() {
  try {
    statusEl.textContent = "Loading todos...";

    const response = await fetch("/api/todos");
    if (!response.ok) {
      throw new Error("Failed to fetch todos");
    }

    const payload = await response.json();
    renderTodos(payload.data || []);
    statusEl.textContent = `Loaded from ${payload.source} • ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    statusEl.textContent = error.message;
  }
}

function renderTodos(todos) {
  todoList.innerHTML = "";

  if (!todos.length) {
    const item = document.createElement("li");
    item.textContent = "No todos yet. Add your first one!";
    todoList.appendChild(item);
    return;
  }

  for (const todo of todos) {
    const item = document.createElement("li");

    const title = document.createElement("span");
    title.textContent = todo.title;

    const createdAt = document.createElement("span");
    createdAt.className = "todo-time";
    createdAt.textContent = new Date(todo.created_at).toLocaleString();

    item.appendChild(title);
    item.appendChild(createdAt);
    todoList.appendChild(item);
  }
}

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = todoInput.value.trim();
  if (!title) {
    return;
  }

  try {
    const response = await fetch("/api/todos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error("Failed to create todo");
    }

    todoInput.value = "";
    await loadTodos();
    await loadHealthAndStats();
  } catch (error) {
    statusEl.textContent = error.message;
  }
});

refreshButton.addEventListener("click", async () => {
  await loadTodos();
  await loadHealthAndStats();
});

async function init() {
  await loadTodos();
  await loadHealthAndStats();
}

init();
