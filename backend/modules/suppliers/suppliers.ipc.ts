// modules/suppliers/suppliers.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./suppliers.controller";

export function registerSuppliersIpcHandlers() {
  ipcMain.handle("suppliers:create", (_e, input) =>
    withErrorHandling("suppliers:create", controller.createSupplierController)(input)
  );
  ipcMain.handle("suppliers:update", (_e, input) =>
    withErrorHandling("suppliers:update", controller.updateSupplierController)(input)
  );
  ipcMain.handle("suppliers:list", (_e) =>
    withErrorHandling("suppliers:list", controller.listSuppliersController)(undefined as never)
  );
  ipcMain.handle("suppliers:getDebt", (_e, input) =>
    withErrorHandling("suppliers:getDebt", controller.getSupplierDebtController)(input)
  );
  ipcMain.handle("suppliers:deactivate", (_e, input) =>
    withErrorHandling("suppliers:deactivate", controller.deactivateSupplierController)(input)
  );
}
