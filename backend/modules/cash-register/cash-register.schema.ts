// modules/cash-register/cash-register.schema.ts
import { z } from "zod";

export const openSessionSchema = z.object({
  openingAmount: z.number().min(0),
});
export type OpenSessionInput = z.infer<typeof openSessionSchema>;

export const closeSessionSchema = z.object({
  sessionId: z.number().int().positive(),
  actualAmount: z.number().min(0),
  notes: z.string().max(500).nullable().optional(),
});
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;

export const recordExpenseSchema = z.object({
  sessionId: z.number().int().positive(),
  category: z.string().min(2).max(100),
  amount: z.number().positive(),
  description: z.string().max(300).nullable().optional(),
});
export type RecordExpenseInput = z.infer<typeof recordExpenseSchema>;

export const manualCashMovementSchema = z.object({
  sessionId: z.number().int().positive(),
  direction: z.enum(["in", "out"]), // إيداع يدوي أو سحب يدوي من الصندوق
  amount: z.number().positive(),
  description: z.string().max(300),
});
export type ManualCashMovementInput = z.infer<typeof manualCashMovementSchema>;
