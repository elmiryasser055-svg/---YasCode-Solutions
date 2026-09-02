// modules/purchases/purchases.ipc.ts
import { ipcMain } from "electron";
import { withErrorHandling } from "../../middleware/ipcErrorHandler";
import * as controller from "./purchases.controller";

export function registerPurchasesIpcHandlers() {
  ipcMain.handle("purchases:create", (_e, input) =>
    withErrorHandling("purchases:create", controller.createPurchaseController)(input)
  );
  ipcMain.handle("purchases:recordSupplierPayment", (_e, input) =>
    withErrorHandling(
      "purchases:recordSupplierPayment",
      controller.recordSupplierPaymentController
    )(input)
  );
  ipcMain.handle("purchases:listBySupplier", (_e, supplierId) =>
    withErrorHandling(
      "purchases:listBySupplier",
      controller.listPurchasesBySupplierController
    )(supplierId)
  );
}
