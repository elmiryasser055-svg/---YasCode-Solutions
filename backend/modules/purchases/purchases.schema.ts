// modules/purchases/purchases.schema.ts
import { z } from "zod";

const purchaseItemInputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
});

export const createPurchaseSchema = z.object({
  supplierId: z.number().int().positive(),
  invoiceNumber: z.string().max(100).nullable().optional(),
  items: z.array(purchaseItemInputSchema).min(1, "يجب إضافة منتج واحد على الأقل"),
  amountPaid: z.number().min(0).default(0), // 0 = فاتورة آجلة بالكامل
});
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const recordSupplierPaymentSchema = z.object({
  supplierId: z.number().int().positive(),
  purchaseId: z.number().int().positive().nullable().optional(),
  amount: z.number().positive(),
  notes: z.string().max(300).nullable().optional(),
});
export type RecordSupplierPaymentInput = z.infer<typeof recordSupplierPaymentSchema>;
