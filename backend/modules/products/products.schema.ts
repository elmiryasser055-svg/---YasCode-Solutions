// modules/products/products.schema.ts
import { z } from "zod";

export const createProductSchema = z
  .object({
    barcode: z.string().min(4).max(50).nullable().optional(),
    name: z.string().min(2).max(150),
    categoryId: z.number().int().positive().nullable().optional(),
    unitType: z.enum(["piece", "weight"]),
    weightUnit: z.enum(["kg", "g"]).nullable().optional(),
    purchasePrice: z.number().min(0),
    sellingPrice: z.number().positive(),
    lowStockThreshold: z.number().min(0).default(5),
    expiryDate: z.string().date().nullable().optional(), // ISO "YYYY-MM-DD"
  })
  .refine((d) => d.unitType !== "weight" || !!d.weightUnit, {
    message: "المنتجات التي تُباع بالوزن تحتاج تحديد وحدة الوزن (kg/g).",
    path: ["weightUnit"],
  })
  .refine((d) => d.sellingPrice >= d.purchasePrice, {
    message: "سعر البيع يجب ألا يكون أقل من سعر الشراء.",
    path: ["sellingPrice"],
  });
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(150).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  purchasePrice: z.number().min(0).optional(),
  sellingPrice: z.number().positive().optional(),
  lowStockThreshold: z.number().min(0).optional(),
  expiryDate: z.string().date().nullable().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productIdSchema = z.object({ id: z.number().int().positive() });

export const searchProductsSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(30),
});
export type SearchProductsInput = z.infer<typeof searchProductsSchema>;
