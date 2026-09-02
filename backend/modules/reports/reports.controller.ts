// modules/reports/reports.controller.ts
// التقارير المالية بيانات حسّاسة → owner فقط (نفس قيد المرحلة 1: الكاشير لا يصل للتقارير المالية)

import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { profitTrendSchema } from "./reports.schema";
import * as reportsService from "./reports.service";

export const getProfitTrendController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(profitTrendSchema, (validInput) => reportsService.getProfitTrend(validInput))(
      input
    )
  )
);

export const getTodaySummaryController = requireAuth(
  requireRole(["owner"], async () => reportsService.getTodaySummary())
);
