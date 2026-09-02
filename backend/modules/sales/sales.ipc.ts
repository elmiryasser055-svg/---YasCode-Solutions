// modules/sales/sales.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./sales.controller";

export function registerSalesIpcHandlers() {
  ipcMain.handle("sales:create", (_e, input) =>
    withErrorHandling("sales:create", controller.createSaleController)(input)
  );
  ipcMain.handle("sales:cancel", (_e, input) =>
    withErrorHandling("sales:cancel", controller.cancelSaleController)(input)
  );
  ipcMain.handle("sales:edit", (_e, input) =>
    withErrorHandling("sales:edit", controller.editSaleController)(input)
  );
  ipcMain.handle("sales:reprint", (_e, input) =>
    withErrorHandling("sales:reprint", controller.reprintSaleController)(input)
  );
  ipcMain.handle("sales:get", (_e, input) =>
    withErrorHandling("sales:get", controller.getSaleController)(input)
  );
}
