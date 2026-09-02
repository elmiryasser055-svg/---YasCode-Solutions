// modules/inventory/inventory.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./inventory.controller";

export function registerInventoryIpcHandlers() {
  ipcMain.handle("inventory:adjustStock", (_e, input) =>
    withErrorHandling("inventory:adjustStock", controller.adjustStockController)(input)
  );
  ipcMain.handle("inventory:correctInventory", (_e, input) =>
    withErrorHandling("inventory:correctInventory", controller.correctInventoryController)(input)
  );
  ipcMain.handle("inventory:getLowStock", (_e) =>
    withErrorHandling("inventory:getLowStock", controller.getLowStockController)(undefined as never)
  );
  ipcMain.handle("inventory:getExpiringProducts", (_e, input) =>
    withErrorHandling("inventory:getExpiringProducts", controller.getExpiringProductsController)(input)
  );
  ipcMain.handle("inventory:getExpiredProducts", (_e) =>
    withErrorHandling(
      "inventory:getExpiredProducts",
      controller.getExpiredProductsController
    )(undefined as never)
  );
  ipcMain.handle("inventory:getStockHistory", (_e, productId) =>
    withErrorHandling("inventory:getStockHistory", controller.getStockHistoryController)(productId)
  );
}
