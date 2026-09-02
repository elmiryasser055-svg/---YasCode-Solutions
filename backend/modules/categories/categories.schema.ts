// modules/categories/categories.schema.ts
import { z } from "zod";

export const createCategorySchema = z.object({ name: z.string().min(2).max(100) });
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(100),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryIdSchema = z.object({ id: z.number().int().positive() });
