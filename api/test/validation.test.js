const test = require("node:test");
const assert = require("node:assert/strict");

const { validateCreateTodo, validateTodoId, validateUpdateTodo } = require("../src/validation");

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

test("validateTodoId coerces a positive integer id", () => {
  const result = validateTodoId("42");

  assert.equal(result.success, true);
  assert.equal(result.data, 42);
});

test("validateTodoId rejects invalid ids", () => {
  assert.equal(validateTodoId("abc").success, false);
  assert.equal(validateTodoId("0").success, false);
});

test("validateUpdateTodo accepts completed and trimmed title", () => {
  const result = validateUpdateTodo({ title: "  Review dashboard  ", completed: true });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, { title: "Review dashboard", completed: true });
});

test("validateUpdateTodo rejects empty patch payload", () => {
  const result = validateUpdateTodo({});

  assert.equal(result.success, false);
});
