// modules/reports/reports.schema.ts
import { z } from "zod";

export const profitTrendSchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]),
});
export type ProfitTrendInput = z.infer<typeof profitTrendSchema>;

// ⭐ مخطط جديد لتقارير حركة المنتجات
export const productPerformanceSchema = z.object({
  // عدد الأيام للنظر للوراء (افتراضياً 30 يوماً)
  days: z.number().int().positive().max(365).default(30),
  // عدد النتائج المعروضة (مثلاً أعلى 10 منتجات)
  limit: z.number().int().positive().max(100).default(10),
});
export type ProductPerformanceInput = z.infer<typeof productPerformanceSchema>;