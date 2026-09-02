// modules/reports/reports.schema.ts
import { z } from "zod";

export const profitTrendSchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]),
});
export type ProfitTrendInput = z.infer<typeof profitTrendSchema>;
