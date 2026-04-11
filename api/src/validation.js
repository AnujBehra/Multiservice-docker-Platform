const { z } = require("zod");

const createTodoSchema = z.object({
  title: z.string().trim().min(1, "title is required").max(140, "title must be <= 140 characters"),
});

function validateCreateTodo(payload) {
  return createTodoSchema.safeParse(payload);
}

module.exports = {
  validateCreateTodo,
};
