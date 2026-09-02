// modules/returns/returns.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./returns.controller";

export function registerReturnsIpcHandlers() {
  ipcMain.handle("returns:create", (_e, input) =>
    withErrorHandling("returns:create", controller.createReturnController)(input)
  );
  ipcMain.handle("returns:getForSale", (_e, saleId) =>
    withErrorHandling("returns:getForSale", controller.getReturnsForSaleController)(saleId)
  );
}
