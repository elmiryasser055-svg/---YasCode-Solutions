// modules/cash-register/cash-register.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./cash-register.controller";

export function registerCashRegisterIpcHandlers() {
  ipcMain.handle("cashRegister:open", (_e, input) =>
    withErrorHandling("cashRegister:open", controller.openSessionController)(input)
  );
  ipcMain.handle("cashRegister:close", (_e, input) =>
    withErrorHandling("cashRegister:close", controller.closeSessionController)(input)
  );
  ipcMain.handle("cashRegister:recordExpense", (_e, input) =>
    withErrorHandling("cashRegister:recordExpense", controller.recordExpenseController)(input)
  );
  ipcMain.handle("cashRegister:recordManualMovement", (_e, input) =>
    withErrorHandling(
      "cashRegister:recordManualMovement",
      controller.recordManualMovementController
    )(input)
  );
  ipcMain.handle("cashRegister:getOpenSession", (_e) =>
    withErrorHandling(
      "cashRegister:getOpenSession",
      controller.getOpenSessionController
    )(undefined as never)
  );
  ipcMain.handle("cashRegister:getSessionSummary", (_e, sessionId) =>
    withErrorHandling(
      "cashRegister:getSessionSummary",
      controller.getSessionSummaryController
    )(sessionId)
  );
}
