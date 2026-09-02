// modules/suppliers/suppliers.schema.ts
import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(2).max(150),
  phone: z.string().min(6).max(30).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(150).optional(),
  phone: z.string().min(6).max(30).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const supplierIdSchema = z.object({ id: z.number().int().positive() });
