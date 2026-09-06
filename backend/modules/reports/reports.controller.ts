// modules/reports/reports.controller.ts
import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { profitTrendSchema, productPerformanceSchema } from "./reports.schema";
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

export const getBestSellersController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(productPerformanceSchema, (validInput) =>
      reportsService.getBestSellers(validInput)
    )(input)
  )
);

export const getDeadStockController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(productPerformanceSchema, (validInput) =>
      reportsService.getDeadStock(validInput)
    )(input)
  )
);