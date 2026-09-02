// modules/reports/reports.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./reports.controller";

export function registerReportsIpcHandlers() {
  ipcMain.handle("reports:getProfitTrend", (_e, input) =>
    withErrorHandling("reports:getProfitTrend", controller.getProfitTrendController)(input)
  );
  ipcMain.handle("reports:getTodaySummary", (_e) =>
    withErrorHandling(
      "reports:getTodaySummary",
      controller.getTodaySummaryController
    )(undefined as never)
  );
}
