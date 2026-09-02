// modules/returns/returns.schema.ts
import { z } from "zod";

export const createReturnSchema = z.object({
  saleItemId: z.number().int().positive(),
  quantity: z.number().positive(),
  reason: z.string().min(2).max(300),
});
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
