// modules/inventory/inventory.schema.ts
import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  productId: z.number().int().positive(),
  // موجب = إضافة (stock_in)، سالب = إخراج (stock_out) — النوع يُحدَّد تلقائيًا في service حسب الإشارة
  quantityChange: z.number().refine((n) => n !== 0, "قيمة التغيير يجب ألا تساوي صفرًا"),
  reason: z.string().min(2).max(300),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

export const inventoryAdjustmentSchema = z.object({
  productId: z.number().int().positive(),
  newQuantity: z.number().min(0), // تصحيح جرد: الكمية الفعلية بعد العدّ اليدوي
  reason: z.string().min(2).max(300),
});
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

export const expiringProductsQuerySchema = z.object({
  withinDays: z.number().int().positive().default(30),
});
 