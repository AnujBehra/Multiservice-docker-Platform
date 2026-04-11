const test = require("node:test");
const assert = require("node:assert/strict");

const { validateCreateTodo } = require("../src/validation");

test("validateCreateTodo accepts a valid title", () => {
  const result = validateCreateTodo({ title: "Ship production-ready features" });

  assert.equal(result.success, true);
  assert.equal(result.data.title, "Ship production-ready features");
});

test("validateCreateTodo rejects empty title", () => {
  const result = validateCreateTodo({ title: "   " });

  assert.equal(result.success, false);
});

test("validateCreateTodo rejects very long title", () => {
  const result = validateCreateTodo({ title: "x".repeat(141) });

  assert.equal(result.success, false);
});
