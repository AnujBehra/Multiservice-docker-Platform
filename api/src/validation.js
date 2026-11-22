const { z } = require("zod");

const todoIdSchema = z.coerce.number().int("id must be an integer").positive("id must be positive");

const createTodoSchema = z.object({
  title: z.string().trim().min(1, "title is required").max(140, "title must be <= 140 characters"),
});

const updateTodoSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "title is required")
      .max(140, "title must be <= 140 characters")
      .optional(),
    completed: z.boolean().optional(),
  })
  .refine((payload) => payload.title !== undefined || payload.completed !== undefined, {
    message: "at least one field is required",
  });

function validateTodoId(id) {
  return todoIdSchema.safeParse(id);
}

function validateCreateTodo(payload) {
  return createTodoSchema.safeParse(payload);
}

function validateUpdateTodo(payload) {
  return updateTodoSchema.safeParse(payload);
}

module.exports = {
  validateCreateTodo,
  validateTodoId,
  validateUpdateTodo,
};
