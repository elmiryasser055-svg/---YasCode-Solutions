// modules/sales/sales.schema.ts
import { z } from "zod";

const saleItemInputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(), // decimal مسموح (بيع بالوزن)
});

export const createSaleSchema = z.object({
  items: z.array(saleItemInputSchema).min(1, "يجب إضافة منتج واحد على الأقل"),
  discount: z.number().min(0).default(0),
  cashRegisterSessionId: z.number().int().positive(),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const cancelSaleSchema = z.object({
  saleId: z.number().int().positive(),
  reason: z.string().min(3).max(300),
});
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;

export const editSaleSchema = z.object({
  saleId: z.number().int().positive(),
  items: z.array(saleItemInputSchema).min(1, "يجب أن تحتوي الفاتورة منتجًا واحدًا على الأقل"),
  discount: z.number().min(0).default(0),
  reason: z.string().min(3).max(300),
});
export type EditSaleInput = z.infer<typeof editSaleSchema>;

export const reprintSaleSchema = z.object({
  saleId: z.number().int().positive(),
});

export const getSaleSchema = z.object({
  saleId: z.number().int().positive(),
});
